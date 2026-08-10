"""Module 19 — Energy Center settings (non-AI/ML).

CO₂ and savings use configured factors — never invent emission or savings values.
"""

from sqlalchemy import Column, Float, String, UniqueConstraint

from app.models.base import Base


class EnergySettings(Base):
    __tablename__ = "energy_settings"
    __table_args__ = (
        UniqueConstraint("company_id", name="uq_energy_settings_company"),
    )

    company_id = Column(String(64), nullable=False, index=True, default="default")
    # kg CO₂e per kWh — leave null until plant enters a real grid factor
    co2_kg_per_kwh = Column(Float, nullable=True)
    # € per kWh — used to derive cost when meter cost is missing
    euro_per_kwh = Column(Float, nullable=True)
    # Reference period consumption (kWh) for savings potential vs current totals
    baseline_period_kwh = Column(Float, nullable=True)
    currency = Column(String(8), nullable=False, default="EUR")
