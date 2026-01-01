type Question = {
  id: number;
  externalId: number;
  text: string;
};

export type QuestionCardProps = {
  q: Question;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
};

export default function QuestionCard({
  q,
  value,
  onChange,
}: QuestionCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-baseline gap-2">
        <b>#{q.externalId}</b>
        <span>{q.text}</span>
      </div>

      <div className="mt-2.5 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`q_${q.id}`}
            checked={value === true}
            onChange={() => onChange(true)}
          />
          Sí
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`q_${q.id}`}
            checked={value === false}
            onChange={() => onChange(false)}
          />
          No
        </label>
      </div>
    </div>
  );
}
