import type { DashboardHelp } from "../model/types";
import { dashboardObjective } from "../model/helpContent";

export function HelpDialog({ help, onClose }: { help: DashboardHelp; onClose: () => void }) {
  return (
    <div className="helpOverlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="helpDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="helpClose" onClick={onClose} aria-label="Đóng">×</button>
        <span className="chartKicker">CÁCH ĐỌC DASHBOARD</span>
        <h2 id="dashboard-help-title">{help.title}</h2>
        <section><h3>Đây là gì?</h3><p>{help.purpose}</p></section>
        <section className="helpObjective"><h3>Mục tiêu quản trị</h3><p>{help.objective ?? dashboardObjective(help.title)}</p></section>
        <section><h3>Cách tính</h3><p>{help.calculation}</p></section>
        <section className="helpExample"><h3>Ví dụ</h3><p>{help.example}</p></section>
        {help.note && <section><h3>Lưu ý</h3><p>{help.note}</p></section>}
      </aside>
    </div>
  );
}
