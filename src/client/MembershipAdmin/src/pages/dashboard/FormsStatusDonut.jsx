import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, value }) {
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {value}
    </text>
  )
}

const COLORS = {
  Pending: '#f79009',
  Verified: '#12b76a',
  Rejected: '#f04438',
}

export default function FormsStatusDonut({ formsByStatus = {} }) {
  const { t } = useTranslation(['dashboard', 'enums'])

  const data = [
    { name: t('enums:formStatus.pending'), value: formsByStatus.pending ?? 0, key: 'Pending' },
    { name: t('enums:formStatus.verified'), value: formsByStatus.verified ?? 0, key: 'Verified' },
    { name: t('enums:formStatus.rejected'), value: formsByStatus.rejected ?? 0, key: 'Rejected' },
  ].filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm h-full">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('donut.title')}</h3>
      </div>
      <div className="px-6 py-6">
        {total === 0 ? (
          <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">{t('donut.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={<SliceLabel />}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key] ?? '#98a2b3'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e4e7ec',
                  fontSize: '12px',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
