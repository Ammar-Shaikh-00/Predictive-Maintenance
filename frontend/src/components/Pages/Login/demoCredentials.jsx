import { useTranslation } from "react-i18next";

const DemoCredentials = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
      <p className="text-xs text-slate-500 text-center">
        {t("login.demoCredentials")}:
      </p>

      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between items-center p-2 bg-[#0f1218] rounded border border-white/10">
          <span className="text-slate-500">{t("login.roles.admin")}:</span>
          <span className="text-slate-300 font-mono">
            admin@example.com / admin123
          </span>
        </div>

        <div className="flex justify-between items-center p-2 bg-[#0f1218] rounded border border-white/10">
          <span className="text-slate-500">{t("login.roles.engineer")}:</span>
          <span className="text-slate-300 font-mono">
            engineer@example.com / engineer123
          </span>
        </div>

        <div className="flex justify-between items-center p-2 bg-[#0f1218] rounded border border-white/10">
          <span className="text-slate-500">{t("login.roles.viewer")}:</span>
          <span className="text-slate-300 font-mono">
            viewer@example.com / viewer123
          </span>
        </div>
      </div>
    </div>
  );
};

export default DemoCredentials;
