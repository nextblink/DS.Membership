import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const RADIAN = Math.PI / 180

function computePromille(row) {
  if (row.voterCount > 0) return (row.memberCount / row.voterCount) * 1000
  if (typeof row.percentage === 'number') return row.percentage * 10
  return 0
}

function barColor(pm) {
  if (pm >= 1)   return '#4ABEA0' // green
  if (pm >= 0.8) return '#f79009' // orange
  return '#f04438'                 // red
}

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value, fill, total }) {
  const radius = outerRadius + 36
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const anchor = x > cx ? 'start' : x < cx ? 'end' : 'middle'

  // line from slice edge to label
  const lineR1 = outerRadius + 6
  const lineR2 = outerRadius + 22
  const x1 = cx + lineR1 * Math.cos(-midAngle * RADIAN)
  const y1 = cy + lineR1 * Math.sin(-midAngle * RADIAN)
  const x2 = cx + lineR2 * Math.cos(-midAngle * RADIAN)
  const y2 = cy + lineR2 * Math.sin(-midAngle * RADIAN)

  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth={1.5} strokeOpacity={0.6} />
      <text
        x={x}
        y={y - 7}
        textAnchor={anchor}
        dominantBaseline="central"
        fill={fill}
        fontSize={10}
        fontWeight={600}
        letterSpacing={0.5}
        style={{ textTransform: 'uppercase' }}
      >
        {name}
      </text>
      <text
        x={x}
        y={y + 9}
        textAnchor={anchor}
        dominantBaseline="central"
        fill={fill}
        fontSize={15}
        fontWeight={700}
      >
        {value} <tspan fontSize={12} fontWeight={600} opacity={0.75}>{percentage}%</tspan>
      </text>
    </g>
  )
}

export default function FormsStatusDonut({ membersByOrgUnit = [] }) {
  const { t } = useTranslation('dashboard')

  const data = useMemo(() => {
    let highCount = 0  // ≥1‰ (green)
    let midCount = 0   // 0.8-1‰ (orange)
    let lowCount = 0   // <0.8‰ (red)

    membersByOrgUnit.forEach((org) => {
      const pm = computePromille(org)
      if (pm >= 1) highCount++
      else if (pm >= 0.8) midCount++
      else lowCount++
    })

    return [
      { name: t('engagement.high'),   value: highCount, key: 'high',   color: '#4ABEA0' },
      { name: t('engagement.medium'), value: midCount,  key: 'medium', color: '#f79009' },
      { name: t('engagement.low'),    value: lowCount,  key: 'low',    color: '#f04438' },
    ].filter((d) => d.value > 0)
  }, [membersByOrgUnit])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm h-full">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h3 className="text-base font-semibold text-brand-500 dark:text-brand-400">{t('engagementChart.title')}</h3>
      </div>

      <div className="px-4 py-5">
        {total === 0 ? (
          <div className="flex h-48 items-center justify-center text-theme-sm text-gray-400 dark:text-gray-500">
            {t('donut.noData')}
          </div>
        ) : (
          <div className="relative" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  labelLine={false}
                  label={(props) => <SliceLabel {...props} total={total} />}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e4e7ec',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center total */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white leading-none">
                {total}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('donut.total')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
