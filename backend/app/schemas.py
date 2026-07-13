from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MerchantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    business_name: str
    location: str


class MerchantUpdate(BaseModel):
    name: str = Field(min_length=1)
    business_name: str = Field(min_length=1)
    location: str = Field(min_length=1)
    # Optional: pasted Google Maps share link, the primary way lat/lon gets
    # set now (see app/maps_link.py). Omitted/blank on saves that don't touch
    # location -- leaves latitude/longitude/geocoded_label untouched.
    maps_link: Optional[str] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)
    business_name: str = Field(min_length=1)
    location: str = Field(min_length=1)


class LoginRequest(BaseModel):
    # Plain str, not EmailStr: this looks up an *already-stored* credential,
    # it doesn't need to re-validate email format (and EmailStr rejects
    # reserved-TLD addresses like the migration's placeholder *.local ones,
    # which would otherwise make already-registered accounts unable to log in).
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    merchant: MerchantOut


class ServiceCreate(BaseModel):
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


class PendingRecommendationOut(BaseModel):
    id: int
    service_id: int
    service_name: str
    suggested_price: Decimal
    rationale_text: str
    created_at: datetime
