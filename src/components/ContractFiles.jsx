/** Short list of every contract file on the desk — original plus amendments. */
export function ContractFiles({ files }) {
  if (!files?.length) return null
  return (
    <div className="contract-files">
      <div className="eyebrow">Contract files</div>
      <ul className="contract-file-list">
        {files.map((f) => (
          <li key={f.url}>
            <a className="ext" href={f.url} target="_blank" rel="noreferrer">
              {f.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
