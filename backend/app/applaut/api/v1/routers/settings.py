from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.applaut.models.application_setting import ApplicationSetting

router = APIRouter(prefix="/settings")


class SettingResponse(BaseModel):
    setting_name: str
    value: str


@router.get("/{setting_name}", response_model=SettingResponse)
async def get_setting(
    setting_name: str,
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(ApplicationSetting).where(ApplicationSetting.setting_name == setting_name)
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Setting '{setting_name}' not found")
    return SettingResponse(setting_name=row.setting_name, value=row.value)
