from config.env import read_env_file


def test_env_file_sets_settings_module(tmp_path, monkeypatch):
    monkeypatch.delenv("DJANGO_SETTINGS_MODULE", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("DJANGO_SETTINGS_MODULE=config.settings.prod\n")

    read_env_file(env_file)

    import os

    assert os.environ["DJANGO_SETTINGS_MODULE"] == "config.settings.prod"


def test_env_file_does_not_override_existing_variables(tmp_path, monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings.test")
    env_file = tmp_path / ".env"
    env_file.write_text("DJANGO_SETTINGS_MODULE=config.settings.prod\n")

    read_env_file(env_file)

    import os

    assert os.environ["DJANGO_SETTINGS_MODULE"] == "config.settings.test"


def test_missing_env_file_is_ignored(tmp_path):
    read_env_file(tmp_path / "absent.env")
