type ExportActionsProps = {
  onOpenImport: () => void;
  exporting: null | "csv" | "pdf";
  periodStatus?: string;
  onExportCsv: () => Promise<void>;
  onExportPdf: () => Promise<void>;
};

export default function ExportActions({
  onOpenImport,
  exporting,
  periodStatus,
  onExportCsv,
  onExportPdf,
}: ExportActionsProps) {
  const normStatus = (periodStatus ?? "").toString().trim().toLowerCase();
  const canImport = normStatus !== "closed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canImport && (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onOpenImport}>
          Importar XLSX
        </button>
      )}

      <button
        className="btn btn-secondary"
        type="button"
        disabled={!!exporting}
        onClick={onExportCsv}>
        {exporting === "csv" ? "Exportando…" : "Exportar CSV"}
      </button>

      <button
        className="btn btn-secondary"
        type="button"
        disabled={!!exporting}
        onClick={onExportPdf}>
        {exporting === "pdf" ? "Generando PDF…" : "Exportar PDF"}
      </button>
    </div>
  );
}
