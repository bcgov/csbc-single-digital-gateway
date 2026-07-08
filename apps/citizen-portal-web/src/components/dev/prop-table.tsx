/** Simple prop/notes table for a component's API reference. */
export function PropTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border text-left">
          <th className="pb-2 pr-6 font-semibold whitespace-nowrap">Prop</th>
          <th className="pb-2 pr-6 font-semibold whitespace-nowrap">Type</th>
          <th className="pb-2 pr-6 font-semibold whitespace-nowrap">Default</th>
          <th className="pb-2 font-semibold">Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([prop, type, def, notes]) => (
          <tr key={prop} className="border-b border-border/40 last:border-0">
            <td className="py-2 pr-6 align-top">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                {prop}
              </code>
            </td>
            <td className="py-2 pr-6 text-muted-foreground align-top whitespace-nowrap">{type}</td>
            <td className="py-2 pr-6 text-muted-foreground align-top">{def}</td>
            <td className="py-2 text-muted-foreground align-top">{notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
