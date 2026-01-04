type ExportActionsProps = {
  onOpenImport: () => void;
  exporting: null | "csv" | "pdf";
  onExportCsv: () => Promise<void>;
  onExportPdf: () => Promise<void>;
};

export default function ExportActions({
  onOpenImport,
  exporting,
  onExportCsv,
  onExportPdf,
}: ExportActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="btn btn-secondary"
        type="button"
        onClick={onOpenImport}>
        Importar XLSX
      </button>

      <button
        className="btn btn-secondary"
        type="button"
        disabled={!!exporting}
        onClick={onExportCsv}>
        {exporting === "csv" ? "Exportando…" : "Exportar CSV"}
      </button>

      <button
        className="btn btn-primary"
        type="button"
        disabled={!!exporting}
        onClick={onExportPdf}>
        {exporting === "pdf" ? "Generando PDF…" : "Exportar PDF"}
      </button>
    </div>
  );
}
