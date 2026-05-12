export default function Dashboard() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-black">Dashboard</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {['Total Members', 'Verified Forms', 'Pending Forms', 'Org Units'].map((label) => (
          <div
            key={label}
            className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-sm"
          >
            <h4 className="text-title-md font-bold text-black">—</h4>
            <span className="text-sm font-medium text-body">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-sm border border-stroke bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-black">Welcome</h3>
        <p className="text-sm text-body">
          React client scaffolded. Pages and API integration land in later issues.
        </p>
      </div>
    </div>
  )
}
