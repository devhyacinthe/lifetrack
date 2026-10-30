import factory

from apps.users.models import User

DEFAULT_PASSWORD = "Mot-de-passe-solide-2026"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"utilisateur{n}@example.com")
    first_name = "Ama"
    last_name = "Mensah"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop("password", DEFAULT_PASSWORD)
        return model_class.objects.create_user(*args, password=password, **kwargs)
