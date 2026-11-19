/** Grupo de opções em pílulas (tempo por jogada, aposta), da configuração de partida. */
export function Choices<T extends number>({
  title,
  options,
  value,
  label,
  disabled,
  onChange,
}: {
  title: string;
  options: T[];
  value: T;
  label: (v: T) => string;
  disabled?: (v: T) => boolean;
  onChange: (v: T) => void;
}) {
  const id = `escolha-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <>
      <h2 id={id}>{title}</h2>
      <div className="online-choices" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className={value === o ? "selected" : ""}
            disabled={disabled?.(o)}
            onClick={() => onChange(o)}
          >
            {label(o)}
          </button>
        ))}
      </div>
    </>
  );
}
