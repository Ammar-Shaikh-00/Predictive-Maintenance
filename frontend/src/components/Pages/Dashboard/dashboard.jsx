import React, { useEffect, useState } from 'react'
import TopSection from './topSection'
import MachineState from './machineState'
import KpiCards from './kpiCards'
import TempCards from './tempCards'
import SensorDashboard from './sensorDashboard'
// import { useBackendStore } from '../../../store/backendStore'
import safeApi from '../../../api/safeApi'
import { DashboardSkeleton } from '../../LoadingSkeleton/dashboardSkeleton'
import LiveEstimatedValues from './liveEstimatedValues'


const dashboard = ({backendStatus}) => {
    // const backendStatus = useBackendStore((state) => state.status);
    const [aiStatus, setAiStatus] = useState({})
    const [mssqlStatus, setMssqlStatus] = useState({})
    const [currentDashboardData, setCurrentDashboardData] = useState(null)
    const [mssqlDerived, setMssqlDerived] = useState({})
    const [isLoading, setIsLoading] = useState(true)
    const [machineState, setMachineState] = useState({})

    useEffect(() => {
    let intervalId;
    const fetchDashboardData = async () => {
        try {
        const [
            aiResult,
            mssqlStatusResult,
            mssqlDerivedResult,
            currentDashboardResult,
            machineState,
            runEvalRes
        ] = await Promise.all([
            safeApi.get("/ai/status"),
            safeApi.get("/dashboard/extruder/status"),
            safeApi.get("/dashboard/extruder/derived?window_minutes=30"),
            safeApi.get(`/dashboard/current`),
            safeApi.get("/machine-status"),
            safeApi.get("/live-process-windows?limit=1"),
        ]);

        // Safe state updates
        // setAiStatus((prev) => aiResult?.data || prev );
        setAiStatus({
            "status": "operational",
            "color": "text-emerald-600",
            // "error": str(e),
        })
        setMssqlStatus((prev) => mssqlStatusResult?.data || prev  );
        setMssqlDerived((prev) => mssqlDerivedResult?.data || prev );
        setCurrentDashboardData((prev) => currentDashboardResult?.data || prev);
        setMachineState((prev) => ({'status':runEvalRes?.data?.[0]?.confirmed_state} || prev));
        // console.log(currentDashboardData);

        } catch (error) {
        console.error("Dashboard fetch error:", error);

        // Optional: user-friendly fallback state
        setAiStatus({});
        setMssqlStatus({});
        setMssqlDerived({});
        setCurrentDashboardData(null);
        } finally{
            // console.log(currentDashboardData)
            setIsLoading(false);
        }
    };

    
    fetchDashboardData();

    // ✅ Run every 10 seconds (change as needed)
    intervalId = setInterval(fetchDashboardData, 7000);

    // ✅ Cleanup (VERY IMPORTANT)
    return () => {
        clearInterval(intervalId);
    };
    }, [backendStatus]);


    if(isLoading && !currentDashboardData){
        
        return(
            <DashboardSkeleton/>
        )
    }
  return (
    <>  
        <TopSection aiStatus={aiStatus} mssqlStatus = {mssqlStatus} />
        <MachineState machineState={machineState?.status} baseLineStatus={currentDashboardData?.baseline_status} profileStatus={currentDashboardData?.profile_status} />
        <KpiCards currentDashboardData={currentDashboardData} mssqlDerived={mssqlDerived} machineState={machineState?.status}/>
        <TempCards mssqlDerived={mssqlDerived} machineState={machineState?.status} />
        <SensorDashboard backendStatus={backendStatus} />
        {/* <LiveEstimatedValues /> */}
    </>
  )
}

export default dashboard