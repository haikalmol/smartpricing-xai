import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Merchant(Base):
    __tablename__ = "merchant"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    business_name = Column(String, nullable=False)
    location = Column(String, nullable=False)

    services = relationship("Service", back_populates="merchant")


class Service(Base):
    __tablename__ = "service"

    id = Column(Integer, primary_key=True)
    merchant_id = Column(Integer, ForeignKey("merchant.id"), nullable=False)
    name = Column(String, nullable=False)
    listed_price = Column(Numeric(12, 2), nullable=False)
    hpp = Column(Numeric(12, 2), nullable=False)
    # Soft-delete: recommendation rows reference service_id with no ON DELETE
    # CASCADE, and CLAUDE.md requires every approve/reject decision stay logged
    # for Paper A's adoption metrics -- hard-deleting a service would either
    # violate that FK or destroy that history. Deleting just flips this instead.
    is_active = Column(Boolean, nullable=False, default=True)

    merchant = relationship("Merchant", back_populates="services")
    recommendations = relationship("Recommendation", back_populates="service")


class RecommendationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Recommendation(Base):
    __tablename__ = "recommendation"

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("service.id"), nullable=False)
    suggested_price = Column(Numeric(12, 2), nullable=False)
    rationale_text = Column(Text, nullable=False)
    weather_snapshot_json = Column(JSON, nullable=True)
    status = Column(
        Enum(RecommendationStatus, native_enum=False, length=20),
        nullable=False,
        default=RecommendationStatus.pending,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    responded_at = Column(DateTime(timezone=True), nullable=True)

    service = relationship("Service", back_populates="recommendations")
