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
    import uuid

    models_data = load_models_from_file()
    MODELS = {}
    for model in models_data:
        model_id = model.get("modelId")
        if not model_id:
            continue

        existing_id = model.get("id")
        if not existing_id:
            existing_id = str(uuid.uuid4())
            model["id"] = existing_id

        MODELS[model_id] = {
            "id": existing_id,
            "name": model.get("name", model_id),
            "protocol": model.get("protocol", "openai"),
            "supports_multimodal": model.get("supports_multimodal", False),
            "description": model.get("description", ""),
            "url": model.get("url", ""),
            "modelId": model_id,
            "apiKey": model.get("apiKey", ""),
            "published": model.get("published", True),
            "provider": model.get("provider", "")
        }

    settings = load_settings()
    saved_default_model = settings.get("default_model_id")

    if saved_default_model and saved_default_model in MODELS:
        current_model_id = saved_default_model
    elif MODELS:
        published_models = [m for m in MODELS.values() if m.get("published")]
        if published_models:
            current_model_id = published_models[0]["modelId"]
        else:
            current_model_id = list(MODELS.keys())[0] if MODELS else None

    try:
        with open(MODELS_FILE, 'w', encoding='utf-8') as f:
            json.dump(models_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Model] 保存模型配置失败: {e}")

initialize_models()


@router.get("/", response_model=List[ModelInfo])
async def get_models():
    return [ModelInfo(**model) for model in MODELS.values()]


@router.get("/current")
async def get_current_model():
    if current_model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")
    return ModelInfo(**MODELS[current_model_id])


@router.get("/embedding")
async def get_embedding_model():
    settings = load_settings()
    embedding_model_id = settings.get("embedding_model_id")
    if embedding_model_id and embedding_model_id in MODELS:
        return ModelInfo(**MODELS[embedding_model_id])
    return None


@router.get("/published")
async def get_published_models():
    return [ModelInfo(**model) for model in MODELS.values() if model.get("published")]


@router.put("/{model_id}")
async def update_model(model_id: str, model_data: dict):
    global MODELS

    if model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")

    existing_model = MODELS[model_id]

    updated_model = {
        "id": existing_model.get("id"),
        "name": model_data.get("name", model_id),
        "protocol": model_data.get("protocol", "openai"),
        "supports_multimodal": model_data.get("supports_multimodal", False),
        "description": model_data.get("description", ""),
        "url": model_data.get("url", ""),
        "modelId": model_id,
        "apiKey": model_data.get("apiKey", ""),
        "published": model_data.get("published", True),
        "provider": model_data.get("provider", "")
    }

    MODELS[model_id] = updated_model

    models_data = load_models_from_file()
    for i, m in enumerate(models_data):
        if m.get("modelId") == model_id:
            models_data[i] = updated_model
            break
    else:
        models_data.append(updated_model)

    try:
        MODELS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MODELS_FILE, 'w', encoding='utf-8') as f:
            json.dump(models_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Model] 保存模型配置失败: {e}")

    return {"success": True, "model": updated_model}


@router.delete("/{model_id}")
async def delete_model(model_id: str):
    global MODELS

    if model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")

    deleted_model = MODELS.pop(model_id)

    models_data = load_models_from_file()
    models_data = [m for m in models_data if m.get("modelId") != model_id]

    try:
        MODELS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MODELS_FILE, 'w', encoding='utf-8') as f:
            json.dump(models_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Model] 保存模型配置失败: {e}")

    return {"success": True, "message": f"模型 {deleted_model.get('name')} 已删除"}


@router.post("/")
async def create_model(model_data: dict):
    global MODELS

    model_id = model_data.get("modelId")
    if not model_id:
        raise HTTPException(status_code=400, detail="Model ID is required")

    if model_id in MODELS:
        raise HTTPException(status_code=400, detail="Model already exists")

    import uuid
    new_model = {
        "id": str(uuid.uuid4()),
        "name": model_data.get("name", model_id),
        "protocol": model_data.get("protocol", "openai"),
        "supports_multimodal": model_data.get("supports_multimodal", False),
        "description": model_data.get("description", ""),
        "url": model_data.get("url", ""),
        "modelId": model_id,
        "apiKey": model_data.get("apiKey", ""),
        "published": model_data.get("published", True),
        "provider": model_data.get("provider", "")
    }

    MODELS[model_id] = new_model

    models_data = load_models_from_file()
    models_data.append(new_model)

    try:
        MODELS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MODELS_FILE, 'w', encoding='utf-8') as f:
            json.dump(models_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Model] 保存模型配置失败: {e}")

    return {"success": True, "model": new_model}


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


@router.post("/set-embedding")
async def set_embedding_model(data: ModelSwitch):
    settings = load_settings()

    if not data.model_id:
        if "embedding_model_id" in settings:
            del settings["embedding_model_id"]
            save_settings(settings)
            from services.vector_store import reset_embedding_function
            reset_embedding_function()
        return {"success": True, "message": "已移除嵌入模型"}

    if data.model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")

    model_config = MODELS[data.model_id]
    settings["embedding_model_id"] = data.model_id
    save_settings(settings)

    from services.vector_store import reset_embedding_function
    reset_embedding_function()

    return {"success": True, "message": f"嵌入模型已设置为 {model_config['name']}"}


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
