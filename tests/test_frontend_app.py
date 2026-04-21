from __future__ import annotations

import importlib.util
import runpy
import sys
import types
from pathlib import Path


class _FakeSidebar:
    def __init__(self, streamlit_module: types.ModuleType) -> None:
        self._streamlit_module = streamlit_module

    def title(self, *_args, **_kwargs) -> None:
        return None

    def markdown(self, *_args, **_kwargs) -> None:
        return None

    def button(self, *_args, **_kwargs) -> bool:
        return bool(getattr(self._streamlit_module, "_button_return", False))


def _load_frontend_app_module() -> tuple[types.ModuleType, types.ModuleType, dict[str, int], dict[str, types.ModuleType | None]]:
    calls = {"render_auth": 0, "rerun": 0}

    fake_streamlit = types.ModuleType("streamlit")
    fake_streamlit.session_state = {}
    fake_streamlit._button_return = False
    fake_streamlit.sidebar = _FakeSidebar(fake_streamlit)
    fake_streamlit.set_page_config = lambda **_kwargs: None
    fake_streamlit.title = lambda *_args, **_kwargs: None
    fake_streamlit.markdown = lambda *_args, **_kwargs: None

    def _rerun() -> None:
        calls["rerun"] += 1

    fake_streamlit.rerun = _rerun

    src_package = types.ModuleType("src")
    src_app_package = types.ModuleType("src.app")
    src_app_store_package = types.ModuleType("src.app.store")
    state_session_module = types.ModuleType("src.app.store.session_state")

    def init_session_state() -> None:
        fake_streamlit.session_state.setdefault("authenticated", False)

    state_session_module.init_session_state = init_session_state

    src_shared_package = types.ModuleType("src.shared")
    src_shared_components_package = types.ModuleType("src.shared.components")
    src_shared_feedback_package = types.ModuleType("src.shared.components.feedback")
    auth_module = types.ModuleType("src.shared.components.feedback.auth_component")

    def render_auth() -> None:
        calls["render_auth"] += 1

    auth_module.render_auth = render_auth

    replacement_modules = {
        "streamlit": fake_streamlit,
        "src": src_package,
        "src.app": src_app_package,
        "src.app.store": src_app_store_package,
        "src.app.store.session_state": state_session_module,
        "src.shared": src_shared_package,
        "src.shared.components": src_shared_components_package,
        "src.shared.components.feedback": src_shared_feedback_package,
        "src.shared.components.feedback.auth_component": auth_module,
    }

    original_modules: dict[str, types.ModuleType | None] = {}
    for name, module in replacement_modules.items():
        original_modules[name] = sys.modules.get(name)
        sys.modules[name] = module

    app_path = Path(__file__).resolve().parents[1] / "frontend" / "app.py"
    spec = importlib.util.spec_from_file_location("frontend_app", app_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Failed to load frontend/app.py module")

    frontend_app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(frontend_app)

    return frontend_app, fake_streamlit, calls, original_modules


def _restore_modules(original_modules: dict[str, types.ModuleType | None]) -> None:
    for name, module in original_modules.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module


def _run_frontend_app_as_main() -> tuple[types.ModuleType, dict[str, int], dict[str, types.ModuleType | None]]:
    calls = {"render_auth": 0, "rerun": 0}

    fake_streamlit = types.ModuleType("streamlit")
    fake_streamlit.session_state = {}
    fake_streamlit._button_return = False
    fake_streamlit.sidebar = _FakeSidebar(fake_streamlit)
    fake_streamlit.set_page_config = lambda **_kwargs: None
    fake_streamlit.title = lambda *_args, **_kwargs: None
    fake_streamlit.markdown = lambda *_args, **_kwargs: None

    def _rerun() -> None:
        calls["rerun"] += 1

    fake_streamlit.rerun = _rerun

    src_package = types.ModuleType("src")
    src_app_package = types.ModuleType("src.app")
    src_app_store_package = types.ModuleType("src.app.store")
    state_session_module = types.ModuleType("src.app.store.session_state")

    def init_session_state() -> None:
        fake_streamlit.session_state.setdefault("authenticated", False)

    state_session_module.init_session_state = init_session_state

    src_shared_package = types.ModuleType("src.shared")
    src_shared_components_package = types.ModuleType("src.shared.components")
    src_shared_feedback_package = types.ModuleType("src.shared.components.feedback")
    auth_module = types.ModuleType("src.shared.components.feedback.auth_component")

    def render_auth() -> None:
        calls["render_auth"] += 1

    auth_module.render_auth = render_auth

    replacement_modules = {
        "streamlit": fake_streamlit,
        "src": src_package,
        "src.app": src_app_package,
        "src.app.store": src_app_store_package,
        "src.app.store.session_state": state_session_module,
        "src.shared": src_shared_package,
        "src.shared.components": src_shared_components_package,
        "src.shared.components.feedback": src_shared_feedback_package,
        "src.shared.components.feedback.auth_component": auth_module,
    }

    original_modules: dict[str, types.ModuleType | None] = {}
    for name, module in replacement_modules.items():
        original_modules[name] = sys.modules.get(name)
        sys.modules[name] = module

    app_path = Path(__file__).resolve().parents[1] / "frontend" / "app.py"
    runpy.run_path(str(app_path), run_name="__main__")

    return fake_streamlit, calls, original_modules


def test_main_shows_auth_when_not_authenticated() -> None:
    frontend_app, fake_streamlit, calls, original_modules = _load_frontend_app_module()
    try:
        fake_streamlit.session_state.clear()
        fake_streamlit.session_state["authenticated"] = False

        frontend_app.main()

        assert calls["render_auth"] == 1
    finally:
        _restore_modules(original_modules)


def test_main_renders_dashboard_for_authenticated_user() -> None:
    frontend_app, fake_streamlit, calls, original_modules = _load_frontend_app_module()
    try:
        fake_streamlit.session_state.clear()
        fake_streamlit.session_state.update({"authenticated": True, "username": "ci-user"})

        frontend_app.main()

        assert calls["render_auth"] == 0
    finally:
        _restore_modules(original_modules)


def test_main_logout_clears_state_and_triggers_rerun() -> None:
    frontend_app, fake_streamlit, calls, original_modules = _load_frontend_app_module()
    try:
        fake_streamlit.session_state.clear()
        fake_streamlit.session_state.update({"authenticated": True, "username": "ci-user", "token": "abc"})
        fake_streamlit._button_return = True

        frontend_app.main()

        assert calls["rerun"] == 1
        assert fake_streamlit.session_state == {}
    finally:
        _restore_modules(original_modules)


def test_module_entrypoint_executes_main() -> None:
    fake_streamlit, calls, original_modules = _run_frontend_app_as_main()
    try:
        assert fake_streamlit.session_state.get("authenticated") is False
        assert calls["render_auth"] == 1
    finally:
        _restore_modules(original_modules)
