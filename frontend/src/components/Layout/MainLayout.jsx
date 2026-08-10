import React, { useState } from "react";
import Sidebar from "../SiderBar/sideBar";
import { menuData } from "../../assets/Data/ConstantData";
import Header from "../Header/header";
import Machine from "../Pages/Machines/machine";
import Sensors from "../Pages/Sensors/sensors";
import MaterialProfiles from "../Pages/Material/material";
import Notification from "../Pages/Notification/notification";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import ExtruderLatestValues from "../Pages/ExtruderLatestValues/extruderLatestValuse";
import Baseline from "../Pages/Baseline/baseline";
import { Toaster } from "react-hot-toast";
import ProductionRunDashboard from "../Pages/ProductionRun/ProductionRunDashboard";
import LiveEstimatedPage from "../Pages/LiveEstimatedPage/LiveEstimatedPage";
import LiveDeviationsPage from "../Pages/LiveDeviations/LiveDeviationsPage";
import HistoricalProductionRunsPage from "../Pages/HistoricalProductionRuns/HistoricalProductionRunsPage";
import MachineSensorViewerPage from "../Pages/MachineSensorViewer/MachineSensorViewerPage";
import OperationsCenterPage from "../Pages/OperationsCenter/OperationsCenterPage";
import MaintenanceHistoryPage from "../Pages/DomainImports/MaintenanceHistoryPage";
import MaintenanceCenterPage from "../Pages/MaintenanceCenter/MaintenanceCenterPage";
import EnergyHistoryPage from "../Pages/DomainImports/EnergyHistoryPage";
import EnergyCenterPage from "../Pages/EnergyCenter/EnergyCenterPage";
import QualityHistoryPage from "../Pages/DomainImports/QualityHistoryPage";
import MaterialBatchesPage from "../Pages/DomainImports/MaterialBatchesPage";
import CurrentOrderPage from "../Pages/ProductionRun/CurrentOrderPage";
import TicketCenterPage from "../Pages/Tickets/TicketCenterPage";
import ExecutiveViewPage from "../Pages/ExecutiveView/ExecutiveViewPage";
import UserNotificationsPage from "../Pages/UserNotifications/UserNotificationsPage";

const MainLayout = ({ backendStatus }) => {
  const [mobileSideBar, setMobileSideBar] = useState(false);

  const machines = [
    {
      id: "1",
      status: "online",
      criticality: "high",
      criticalColor: "bg-rose-500/20 text-rose-200 border border-rose-400/40",
      description: "Created: Feb 5, 2026, 06:15:35 PM",
      location: "No location",
    },
  ];

  const { user, logout } = useAuth();
  if (backendStatus === "offline") {
    logout();
    return null;
  }

  return (
    <div className="zitta-app-shell relative flex min-h-screen w-full min-w-0 max-w-[100%] overflow-x-hidden bg-[#0b0d11]">
      <Sidebar
        menuData={menuData}
        mobileSideBar={mobileSideBar}
        setMobileSideBar={setMobileSideBar}
        variant="industrial"
        user={user}
        role={user?.role?.toUpperCase?.() || "USER"}
        onLogout={logout}
      />
      {mobileSideBar && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSideBar(false)}
        />
      )}

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <Header
          appName="KI-Betriebszentrale"
          tagline="Extrusionslinie 01"
          user={user}
          role={user?.role?.toUpperCase?.() || "USER"}
          aiStatus="healthy"
          aiLoading={false}
          onLogout={logout}
          onMenuClick={() => setMobileSideBar((prev) => !prev)}
          backendStatus={backendStatus}
          variant="industrial"
        />

        <main className="w-full min-w-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
          <div className="zitta-page-content w-full min-w-0 max-w-full">
            <Routes>
              <Route path="/" element={<OperationsCenterPage />} />
              <Route path="operations-center" element={<OperationsCenterPage />} />
              <Route path="executive" element={<ExecutiveViewPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="maintenance" element={<MaintenanceCenterPage />} />
              <Route path="maintenance-history" element={<MaintenanceHistoryPage />} />
              <Route path="energy" element={<EnergyCenterPage />} />
              <Route path="energy-history" element={<EnergyHistoryPage />} />
              <Route path="quality-history" element={<QualityHistoryPage />} />
              <Route path="material-batches" element={<MaterialBatchesPage />} />
              <Route path="machine" element={<Machine machines={machines} />} />
              <Route path="sensor" element={<Sensors />} />
              <Route
                path="material"
                element={<MaterialProfiles backendStatus={backendStatus} />}
              />
              <Route path="notification" element={<Notification />} />
              <Route path="user-notifications" element={<UserNotificationsPage />} />
              <Route path="meine-benachrichtigungen" element={<UserNotificationsPage />} />
              <Route path="extruder-latest-values" element={<ExtruderLatestValues />} />
              <Route path="baseline" element={<Baseline />} />
              <Route path="live-deviations" element={<LiveDeviationsPage />} />
              <Route path="ticket" element={<TicketCenterPage />} />
              <Route path="production-run" element={<CurrentOrderPage />} />
              <Route path="production-run/detail" element={<ProductionRunDashboard />} />
              <Route path="live-estimations" element={<LiveEstimatedPage />} />
              <Route path="historical-runs" element={<HistoricalProductionRunsPage />} />
              <Route path="time-range-data-view" element={<MachineSensorViewerPage />} />
            </Routes>
          </div>
        </main>
        <Toaster
          toastOptions={{
            style: {
              background: "#141820",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
      </div>
    </div>
  );
};

export default MainLayout;
