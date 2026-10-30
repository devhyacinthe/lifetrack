# Déploiement du backend sur o2switch

> ⚠️ **Brouillon non testé.** Cette procédure n'a encore été exécutée sur aucun serveur. Les éléments marqués *(à vérifier)* doivent être confirmés lors de la phase 1b, et ce document sera corrigé avec les valeurs réellement observées.

## 1. Prérequis

- Un compte o2switch avec accès au cPanel. Les commandes de ce document s'exécutent dans l'outil **Terminal** du cPanel (disponible, confirmé). SSH n'est pas nécessaire ; il reste une option pour travailler depuis un terminal local.
- Python **3.12** dans *Setup Python App* (3.12.16 relevé dans le cPanel).
- Une base **MariaDB** créée dans *Bases de données MySQL®* du cPanel, avec un utilisateur dédié qui a tous les privilèges sur cette base. Version serveur relevée : **11.4.13-MariaDB** (Django 5.2 exige MariaDB 10.5 ou plus récent).
- Un sous-domaine dédié à l'API, par exemple `api.<domaine>`, avec un certificat SSL (AutoSSL / Let's Encrypt).
- Le dépôt Git accessible depuis le serveur (clonage HTTPS ou SSH, ou outil *Git Version Control* du cPanel).

## 2. Organisation des fichiers sur le serveur (proposition)

```
/home/<utilisateur>/
├── lifetrack/                 # clone du dépôt (le code n'est PAS dans public_html)
│   └── backend/               # racine de l'application Python
│       ├── passenger_wsgi.py
│       ├── .env               # secrets de production (non versionné, droits 600)
│       └── staticfiles/       # résultat de collectstatic (servi par WhiteNoise)
├── lifetrack-media/           # fichiers téléversés éventuels, hors du code
└── virtualenv/lifetrack/backend/3.12/   # créé par Setup Python App (à vérifier)
```

## 3. Création de l'application Python dans le cPanel

Dans *Setup Python App* → *Create Application* :

| Champ | Valeur |
|---|---|
| Python version | 3.12.x |
| Application root | `lifetrack/backend` |
| Application URL | `api.<domaine>` |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |

## 4. Configuration WSGI

`backend/passenger_wsgi.py` ajoute `backend/` au chemin Python, définit `DJANGO_SETTINGS_MODULE=config.settings.prod` (sauf si la variable est déjà définie) et expose `application`.

*(À vérifier)* : à la création de l'application, Setup Python App peut générer son propre `passenger_wsgi.py`. Si c'est le cas, il faut le remplacer par celui du dépôt (`git checkout passenger_wsgi.py`).

*(À vérifier)* : il faut confirmer que Passenger transmet correctement le schéma HTTPS à Django (`request.is_secure()`). Si ce n'est pas le cas (boucle de redirection avec `SECURE_SSL_REDIRECT`), définir `DJANGO_BEHIND_PROXY=True`.

## 5. Installation des dépendances

Ouvrir le Terminal du cPanel et activer l'environnement virtuel. Le cPanel affiche la commande exacte en haut de la page de l'application *(à vérifier)* :

```bash
source /home/<utilisateur>/virtualenv/lifetrack/backend/3.12/bin/activate
cd /home/<utilisateur>/lifetrack/backend
pip install -r requirements.txt
```

**Contrainte constatée :** o2switch refuse l'accès au compilateur (`Permission denied: 'gcc'`). Toute dépendance doit donc fournir un wheel Linux précompilé (manylinux) pour Python 3.12. C'est pourquoi le pilote MariaDB est `PyMySQL` et non `mysqlclient`.

## 6. Variables d'environnement

Elles peuvent être définies dans *Setup Python App* (section *Environment variables*) ou dans `backend/.env` (droits `600`). La liste définitive sera dans `backend/.env.example` (phase 1).

| Variable | Exemple (fictif) |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` |
| `DJANGO_SECRET_KEY` | *(générer une clé aléatoire unique)* |
| `DJANGO_ALLOWED_HOSTS` | `api.exemple.com` |
| `DATABASE_URL` | `mysql://utilisateur:motdepasse@localhost:3306/nom_base` |
| `CORS_ALLOWED_ORIGINS` | *(vide pour une application mobile native)* |
| `CSRF_TRUSTED_ORIGINS` | `https://api.exemple.com` |

## 7. Migrations

Elles sont exécutées **explicitement**, jamais automatiquement au démarrage :

```bash
python manage.py migrate --noinput
python manage.py createcachetable      # cache en base utilisé par le throttling
```

## 8. Fichiers statiques

```bash
python manage.py collectstatic --noinput
```

WhiteNoise sert `staticfiles/` directement depuis Django, sans configuration Apache. Les éventuels fichiers téléversés (`MEDIA_ROOT`) sont stockés hors du dépôt.

## 9. Domaine et HTTPS

- Créer le sous-domaine dans le cPanel et vérifier que le certificat SSL est actif.
- `config.settings.prod` active `SECURE_SSL_REDIRECT`, `SECURE_PROXY_SSL_HEADER`, des cookies `Secure` et HSTS (activé progressivement).

## 10. Redémarrage de l'application

- Bouton *Restart* dans *Setup Python App*,
- ou dans le Terminal : `touch tmp/restart.txt` dans la racine de l'application *(à vérifier)*.

## 11. Diagnostic

- `https://api.<domaine>/api/v1/health/` doit répondre 200.
- Journaux : fichier de log de Passenger ou `stderr.log` dans la racine de l'application *(à vérifier)*.
- `python manage.py check --deploy` dans l'environnement virtuel.
- Ne jamais activer `DEBUG=True` en production pour diagnostiquer.

## 12. Retour à une version précédente

1. Sauvegarder la base avant chaque déploiement (`mariadb-dump --single-transaction`, ou l'outil de sauvegarde du cPanel).
2. `git checkout <tag-précédent>` dans `lifetrack/`.
3. Si des migrations ont été appliquées : `python manage.py migrate <app> <migration_précédente>`, ou restaurer la sauvegarde.
4. `pip install -r requirements.txt`, `collectstatic`, puis redémarrer.

Chaque version déployée est identifiée par un tag Git (`v0.1.0`, …).
