const DefaultIcon = () => (
  <svg
    className="h-6 w-6 text-primary"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
)

export default function StatsCard({ label, value, sublabel, icon, iconColor = 'bg-primary/10' }) {
  return (
    <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconColor} dark:bg-meta-4`}>
        {icon ?? <DefaultIcon />}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <h4 className="text-title-md font-bold text-black dark:text-white text-3xl">
            {value}
          </h4>
          <span className="text-sm font-medium text-body">{label}</span>
          {sublabel ? (
            <div className="mt-1 text-xs text-bodydark2">{sublabel}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
