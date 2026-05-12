// Donut chart of Forms by status using recharts PieChart.
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const STATUS_COLORS = {
  Pending: '#FFA70B', // warning
  Verified: '#10B981', // success
  Rejected: '#F87171', // danger
}

export default function FormsStatusDonut({ formsByStatus }) {
  const data = [
    { name: 'Pending', value: formsByStatus?.pending ?? 0 },
    { name: 'Verified', value: formsByStatus?.verified ?? 0 },
    { name: 'Rejected', value: formsByStatus?.rejected ?? 0 },
  ]
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-5">
      <div className="mb-3 justify-between gap-4 sm:flex">
        <div>
          <h5 className="text-xl font-semibold text-black dark:text-white">
            Forms by Status
          </h5>
        </div>
      </div>
      <div className="mb-2">
        <div className="mx-auto flex h-[280px] w-full justify-center">
          {total === 0 ? (
            <div className="flex items-center justify-center text-sm text-body">
              No forms yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value.toLocaleString(), name]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-y-3 sm:gap-x-7.5">
        {data.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0
          return (
            <div key={d.name} className="flex items-center gap-2">
              <span
                className="block h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[d.name] }}
              />
              <span className="text-sm font-medium text-black dark:text-white">
                {d.name}
              </span>
              <span className="text-sm text-body">
                {d.value.toLocaleString()} ({pct.toFixed(1)}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
