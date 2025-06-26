import React from 'react'

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Customers */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block p-2 bg-gray-100 rounded-full">
              <span className="material-icons text-gray-500" aria-label="Customers">groups</span>
            </span>
            <span className="text-gray-500 text-sm">Customers</span>
          </div>
          <div className="text-3xl font-bold">3,782</div>
          <div className="text-green-500 text-sm font-medium">▲ 11.01%</div>
        </div>
        {/* Orders */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block p-2 bg-gray-100 rounded-full">
              <span className="material-icons text-gray-500" aria-label="Orders">inventory_2</span>
            </span>
            <span className="text-gray-500 text-sm">Orders</span>
          </div>
          <div className="text-3xl font-bold">5,359</div>
          <div className="text-red-500 text-sm font-medium">▼ 9.05%</div>
        </div>
        {/* Monthly Target */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block p-2 bg-gray-100 rounded-full">
              <span className="material-icons text-gray-500" aria-label="Target">track_changes</span>
            </span>
            <span className="text-gray-500 text-sm">Monthly Target</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="w-24 h-24 relative">
              {/* Progress Circle Placeholder */}
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-indigo-500"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="75, 100"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-indigo-600">75%</span>
            </div>
            <div className="flex flex-col ml-4">
              <span className="text-green-500 text-sm font-medium">+10%</span>
              <span className="text-gray-400 text-xs">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Sales */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="font-semibold text-gray-800 mb-2">Monthly Sales</div>
          {/* Bar Chart Placeholder */}
          <div className="flex items-end h-32 gap-2">
            {[100, 300, 200, 250, 180, 150, 220, 280, 320, 210, 170, 90].map((v, i) => (
              <div key={i} className="flex flex-col items-center w-4">
                <div className="bg-indigo-400 rounded-t h-full" style={{ height: `${v / 3}px` }} />
                <span className="text-xs text-gray-400 mt-1">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Statistics */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="font-semibold text-gray-800 mb-2">Statistics</div>
          {/* Line Chart Placeholder */}
          <div className="h-32 flex items-end">
            <svg viewBox="0 0 300 100" className="w-full h-full">
              <polyline
                fill="url(#gradient)"
                stroke="#6366f1"
                strokeWidth="2"
                points="0,80 30,60 60,65 90,50 120,55 150,40 180,45 210,30 240,35 270,20 300,25"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customers Demographic */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="font-semibold text-gray-800 mb-2">Customers Demographic</div>
          <div className="h-32 flex items-center justify-center text-gray-400">[Map Placeholder]</div>
        </div>
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800">Recent Orders</span>
            <button className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200" tabIndex={0} aria-label="See all orders">See all</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="py-1">Product</th>
                <th className="py-1">Price</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">Macbook Pro 13"</td>
                <td className="py-1">$2399.00</td>
                <td className="py-1 text-green-500">Delivered</td>
              </tr>
              <tr>
                <td className="py-1">Apple Watch Ultra</td>
                <td className="py-1">$799.00</td>
                <td className="py-1 text-yellow-500">Pending</td>
              </tr>
              <tr>
                <td className="py-1">iPhone 15 Pro</td>
                <td className="py-1">$1299.00</td>
                <td className="py-1 text-red-500">Cancelled</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Home;