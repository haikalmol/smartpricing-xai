from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ServiceCreate(BaseModel):
    merchant_id: int
    name: str
    listed_price: Decimal = Field(gt=0)
    hpp: Decimal = Field(gt=0)


class ServiceHppUpdate(BaseModel):
    hpp: Decimal = Field(gt=0)


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    merchant_id: int
    name: str
    listed_price: Decimal
    hpp: Decimal


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    suggested_price: Decimal
    rationale_text: str
    weather_snapshot_json: Optional[dict]
    status: str
    created_at: datetime
    responded_at: Optional[datetime]


class RecommendationRespond(BaseModel):
    status: Literal["approved", "rejected"]
