export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-slate-800 rounded-2xl"></div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-72 bg-slate-800 rounded-2xl"></div>
                <div className="h-72 bg-slate-800 rounded-2xl"></div>
            </div>
        </div>
    );
}