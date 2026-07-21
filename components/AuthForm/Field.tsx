import styles from "./AuthForm.module.css"

type FieldProps = {
  id: string
  label: string
  type: React.HTMLInputTypeAttribute
  value: string
  onChange: (value: string) => void
  autoComplete: string
  /** Optional trailing adornment rendered inside the input, e.g. a visibility toggle. */
  children?: React.ReactNode
}

export default function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  children,
}: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          className={
            children ? `${styles.input} ${styles.inputAdornment}` : styles.input
          }
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
        />
        {children}
      </div>
    </div>
  )
}
