from fastapi import APIRouter, HTTPException
from typing import List, Optional
import json
from pathlib import Path

from models.schemas import ModelInfo, ModelSwitch

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_FILE = BASE_DIR / "data" / "models.json"
SETTINGS_FILE = BASE_DIR / "data" / "settings.json"

def load_models_from_file():
    if MODELS_FILE.exists():
        try:
            with open(MODELS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Model] 加载模型配置失败: {e}")
    return []

def load_settings():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Model] 加载设置失败: {e}")
    return {}

def save_settings(settings):
    try:
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Model] 保存设置失败: {e}")

MODELS = {}
current_model_id = None

def initialize_models():
    global MODELS, current_model_id
    models_data = load_models_from_file()
    MODELS = {}
    for model in models_data:
        model_id = model.get("id")
        if model_id:
            MODELS[model_id] = {
                "id": model_id,
                "name": model.get("name", model_id),
                "protocol": model.get("protocol", "openai"),
                "supports_multimodal": model.get("supports_multimodal", False),
                "description": model.get("description", ""),
                "url": model.get("url", ""),
                "modelId": model.get("modelId", model_id),
                "apiKey": model.get("apiKey", ""),
                "published": model.get("published", True)
            }

    settings = load_settings()
    saved_default_model = settings.get("default_model_id")

    if saved_default_model and saved_default_model in MODELS:
        current_model_id = saved_default_model
    elif MODELS:
        published_models = [m for m in MODELS.values() if m.get("published")]
        if published_models:
            current_model_id = published_models[0]["id"]
        else:
            current_model_id = list(MODELS.keys())[0] if MODELS else None

initialize_models()


@router.get("/", response_model=List[ModelInfo])
async def get_models():
    return [ModelInfo(**model) for model in MODELS.values()]


@router.get("/current")
async def get_current_model():
    if current_model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")
    return ModelInfo(**MODELS[current_model_id])


@router.get("/published")
async def get_published_models():
    return [ModelInfo(**model) for model in MODELS.values() if model.get("published")]


@router.post("/switch")
async def switch_model(data: ModelSwitch):
    global current_model_id
    if data.model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")
    current_model_id = data.model_id
    return {"success": True, "model": MODELS[current_model_id]}


@router.post("/set-default")
async def set_default_model(data: ModelSwitch):
    global current_model_id
    if data.model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")
    current_model_id = data.model_id
    settings = load_settings()
    settings["default_model_id"] = data.model_id
    save_settings(settings)
    return {"success": True, "message": f"默认模型已设置为 {MODELS[current_model_id]['name']}"}


def get_model(model_id: Optional[str] = None) -> Optional[dict]:
    if model_id and model_id in MODELS:
        return MODELS[model_id]
    if current_model_id in MODELS:
        return MODELS[current_model_id]
    return None


def get_current_model_config() -> dict:
    if current_model_id and current_model_id in MODELS:
        return MODELS[current_model_id]
    return MODELS.get(list(MODELS.keys())[0], {}) if MODELS else {}
