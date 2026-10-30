# Déploiement du backend sur o2switch

> **État : phase 2 déployée et vérifiée le 30 octobre 2026** (authentification, première migration, compte administrateur). Le premier déploiement (phase 1b) couvrait l'endpoint de santé et la documentation OpenAPI. Les étapes marquées *(non testé)* n'ont pas encore été exécutées sur le serveur. La procédure de retour arrière sera testée en phase 14.

Environnement de production :

| Élément | Valeur |
|---|---|
| URL de l'API | `https://api.lifetrack.hyacinthe-dalmeida.com` |
| Python | 3.12 (Setup Python App) |
| Base de données | MariaDB 11.4.13, pilote PyMySQL |
| Serveur | Apache + Passenger (`server: o2switch-PowerBoost-v3`) |
| DNS | géré par o2switch (`ns1/ns2.o2switch.net`) |

## 1. Prérequis

- Un accès au cPanel o2switch. Toutes les commandes s'exécutent dans l'outil **Terminal** du cPanel ; SSH n'est pas nécessaire.
- Le dépôt GitHub public `devhyacinthe/lifetrack`. Le serveur ne fait que des `git clone` et des `git pull` ; **on ne commite jamais depuis le serveur**.

### Contraintes constatées

- **Pas de compilateur :** l'accès à `gcc` est refusé (`Permission denied: 'gcc'`). Toute dépendance Python doit donc fournir un wheel Linux précompilé (manylinux) pour Python 3.12. C'est pourquoi le pilote MariaDB est `PyMySQL` et non `mysqlclient`.
- **PostgreSQL inutilisable :** la version installée (9.6) n'est plus maintenue et n'est pas supportée par Django 5.2.
- **Variables d'environnement :** celles saisies dans Setup Python App ne sont transmises qu'à Passenger, pas aux commandes `manage.py` lancées dans le Terminal. On utilise donc **uniquement** le fichier `backend/.env`.

## 2. Organisation des fichiers sur le serveur

```
/home/vjdf1803/
├── lifetrack/                          # clone du dépôt (hors public_html)
│   └── backend/                        # racine de l'application Python
│       ├── passenger_wsgi.py           # versionné
│       ├── .env                        # secrets, non versionné, droits 600
│       ├── staticfiles/                # généré par collectstatic, servi par WhiteNoise
│       ├── passenger.log               # journal de Passenger (ignoré par Git)
│       └── tmp/                        # créé par le cPanel (ignoré par Git)
├── virtualenv/lifetrack/backend/3.12/  # environnement virtuel créé par Setup Python App
└── api.lifetrack.hyacinthe-dalmeida.com/   # racine web du sous-domaine (.htaccess de Passenger)
```

## 3. Installation initiale

### 3.1 Sous-domaine et HTTPS

1. cPanel → **Domaines** → créer `api.lifetrack.hyacinthe-dalmeida.com` (sans partager la racine du document).
2. cPanel → **SSL/TLS Status** : le certificat est d'abord *Self-signed*. Cocher le sous-domaine et cliquer sur **Run AutoSSL**, puis attendre quelques minutes.

### 3.2 Base de données

cPanel → **Bases de données MySQL®** :

1. Créer la base. Le préfixe `vjdf1803_` est ajouté automatiquement.
2. Créer un utilisateur dédié avec un mot de passe fort, de préférence sans `@ : / # ? %` (sinon il faut l'encoder dans l'URL).
3. Associer l'utilisateur à la base avec **tous les privilèges**.

Pour vérifier la version du serveur : `mariadb -u <utilisateur> -p -e "SELECT VERSION();"`

### 3.3 Code source

```bash
cd ~
git clone https://github.com/devhyacinthe/lifetrack.git
cd lifetrack
git checkout <branche-ou-tag>
```

### 3.4 Application Python

cPanel → **Setup Python App** → **Create Application** :

| Champ | Valeur |
|---|---|
| Python version | 3.12.x |
| Application root | `lifetrack/backend` |
| Application URL | `api.lifetrack.hyacinthe-dalmeida.com` (chemin vide) |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |
| Passenger log file | `/home/vjdf1803/lifetrack/backend/passenger.log` |

Ne saisir aucune variable d'environnement dans cet écran (voir §1).

Après la création, lancer `git status` dans `~/lifetrack`. Si `backend/passenger_wsgi.py` apparaît modifié, restaurer la version du dépôt :

```bash
git checkout -- backend/passenger_wsgi.py
```

Notre `passenger_wsgi.py` ajoute `backend/` au chemin Python, force `config.settings.prod` et expose `application`.

### 3.5 Dépendances

Activer l'environnement virtuel avec la commande affichée en haut de la page de l'application dans Setup Python App :

```bash
source /home/vjdf1803/virtualenv/lifetrack/backend/3.12/bin/activate && cd /home/vjdf1803/lifetrack/backend
pip install -r requirements.txt
```

### 3.6 Fichier `.env`

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"   # clé secrète
nano .env
chmod 600 .env
ls -l .env      # attendu : -rw-------
```

Contenu (les valeurs entre `< >` sont à remplacer ; ne jamais les commiter ni les partager) :

```
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=<clé générée>
DJANGO_ALLOWED_HOSTS=api.lifetrack.hyacinthe-dalmeida.com
DATABASE_URL=mysql://<utilisateur_bdd>:<mot_de_passe_bdd>@localhost:3306/<nom_bdd>
CSRF_TRUSTED_ORIGINS=https://api.lifetrack.hyacinthe-dalmeida.com
```

La liste complète des variables est dans `backend/.env.example`.

**`DJANGO_SETTINGS_MODULE=config.settings.prod` est indispensable.** Passenger utilise toujours les paramètres de production. En revanche, sans cette ligne, les commandes `manage.py` lancées dans le Terminal utilisent les paramètres de **développement**. Incident constaté en phase 3 :
- `collectstatic` n'a pas généré le manifeste des fichiers statiques, et `/admin/` répondait 500 (`Missing staticfiles manifest entry`) ;
- `check` signalait `mysql.W002` (mode strict absent).

Pour vérifier les paramètres utilisés :

```bash
python manage.py shell -c "from django.conf import settings; print(settings.SETTINGS_MODULE, settings.DEBUG)"
# attendu : config.settings.prod False
```

Deux variables doivent rester absentes :
- `DJANGO_BEHIND_PROXY` : Passenger transmet correctement le HTTPS à Django (constaté, aucune boucle de redirection).
- `DJANGO_NUM_PROXIES` : Django reçoit la véritable adresse IP du client dans `REMOTE_ADDR`. Constaté en phase 2 : après 6 connexions ratées depuis un téléphone en 4G, un PC sur une autre connexion pouvait toujours se connecter (limitation bien appliquée par IP).

### 3.7 Contrôles, fichiers statiques et démarrage

```bash
python manage.py check --deploy       # attendu : seulement security.W005 et security.W021
python manage.py collectstatic --noinput
touch tmp/restart.txt                 # ou bouton « Restart » dans Setup Python App
```

Les avertissements W005 et W021 sont volontaires : le HSTS est activé progressivement (`max-age=3600`). Pour l'augmenter une fois le HTTPS stable, utiliser `DJANGO_SECURE_HSTS_SECONDS`.

## 4. Vérification après déploiement

```bash
API=https://api.lifetrack.hyacinthe-dalmeida.com
curl -s $API/api/v1/health/; echo                                        # {"status":"ok","database":"ok"}
curl -s -I http://api.lifetrack.hyacinthe-dalmeida.com/api/v1/health/    # 301 vers https://
curl -s -o /dev/null -w "%{http_code}\n" $API/static/admin/css/base.css  # 200
```

Puis ouvrir `https://api.lifetrack.hyacinthe-dalmeida.com/api/docs/` dans un navigateur.

En phase 1b, la réponse de l'endpoint de santé a été vérifiée : `HTTP/2 200` avec `{"status":"ok","database":"ok"}`, et les en-têtes HSTS, `x-frame-options: DENY` et `x-content-type-options: nosniff` sont présents.

## 5. Mise à jour d'une version déployée *(non testé)*

```bash
source /home/vjdf1803/virtualenv/lifetrack/backend/3.12/bin/activate && cd /home/vjdf1803/lifetrack/backend
mariadb-dump --single-transaction -u <utilisateur> -p <nom_bdd> > ~/sauvegardes/lifetrack-$(date +%F-%H%M).sql
git pull
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py check --deploy
touch tmp/restart.txt
```

Puis refaire les vérifications du §4.

Les migrations sont toujours lancées **explicitement**, jamais automatiquement au démarrage. `python manage.py createcachetable` est à lancer une fois, lors du premier déploiement de la phase 2. La commande est sans effet si la table existe déjà.

### Premier déploiement de la phase 2 (première migration)

La base était vide jusqu'ici. Ce déploiement crée toutes les tables, dont le modèle utilisateur personnalisé :

```bash
git pull
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py createcachetable
python manage.py createsuperuser        # compte administrateur (identifiant = e-mail)
python manage.py collectstatic --noinput
python manage.py check --deploy
touch tmp/restart.txt
```

### Conversion de l'encodage en `utf8mb4` (une seule fois, déploiement de la phase 4)

Les tables créées lors des phases 2 et 3 n'utilisaient pas l'encodage du projet : les commandes `manage.py` tournaient alors avec les paramètres de développement. La commande `convert_db_charset` aligne la base et toutes ses tables sur `utf8mb4` / `utf8mb4_unicode_ci`.

```bash
# 1. Sauvegarde obligatoire
mariadb-dump --single-transaction -u <utilisateur_bdd> -p <nom_bdd> > ~/sauvegardes/lifetrack-avant-utf8mb4.sql

# 2. Aperçu, sans rien modifier
python manage.py convert_db_charset

# 3. Conversion, puis contrôle (attendu : « Rien à convertir. »)
python manage.py convert_db_charset --apply
python manage.py convert_db_charset
```

La commande est sans effet si tout est déjà en `utf8mb4_unicode_ci`.

## 6. Diagnostic

- **Endpoint de santé :** un code 503 avec `"database":"unavailable"` signifie que la base est inaccessible. Vérifier `DATABASE_URL` et les privilèges de l'utilisateur.
- **Journaux :** `tail -50 ~/lifetrack/backend/passenger.log`.
- **Configuration :** `python manage.py check --deploy` dans l'environnement virtuel.
- **Ne jamais activer `DEBUG=True` en production** pour diagnostiquer.

## 7. Retour à une version précédente *(non testé, prévu en phase 14)*

1. Sauvegarder la base avant chaque déploiement (voir §5).
2. Dans `~/lifetrack` : `git checkout <tag-précédent>`.
3. Si des migrations ont été appliquées : `python manage.py migrate <app> <migration_précédente>`, ou restaurer la sauvegarde (`mariadb -u <utilisateur> -p <nom_bdd> < sauvegarde.sql`).
4. `pip install -r requirements.txt`, `collectstatic`, puis redémarrer.

Chaque version déployée est identifiée par un tag Git (`v0.1.0`, …).
