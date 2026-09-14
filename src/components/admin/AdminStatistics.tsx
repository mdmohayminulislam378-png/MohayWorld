import React from 'react';
import { Product, Order, Deposit, User } from '../../types.ts';
import { BarChart3, TrendingUp, DollarSign, Users, ShoppingBag, Award, PieChart } from 'lucide-react';

interface AdminStatisticsProps {
  stats: any;
  products: Product[];
  orders: Order[];
  deposits: Deposit[];
  users: User[];
  currency: string;
}

export const AdminStatistics: React.FC<AdminStatisticsProps> = ({
  stats,
  products,
  orders,
  deposits,
  users,
  currency,
}) => {
  const completedOrders = orders.filter((o) => o.status === 'Completed');
  const totalCompletedSales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalCompletedSales / completedOrders.length) : 0;

  const approvedDeposits = deposits.filter((d) => d.status === 'Approved');
  const totalApprovedDeposits = approvedDeposits.reduce((sum, d) => sum + d.amount, 0);
  const avgDepositAmount = approvedDeposits.length > 0 ? Math.round(totalApprovedDeposits / approvedDeposits.length) : 0;

  // Compute sales per product
  const productSalesMap: Record<string, { count: number; revenue: number; name: string }> = {};
  orders.forEach((o) => {
    if (o.status === 'Completed') {
      if (!productSalesMap[o.productId]) {
        productSalesMap[o.productId] = { count: 0, revenue: 0, name: o.productNameEn };
      }
      productSalesMap[o.productId].count += o.quantity;
      productSalesMap[o.productId].revenue += o.totalAmount;
    }
  });

  const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

  const orderConversionRate = orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
          Financial & Sales Analytics
        </h3>
        <p className="text-[11px] text-neutral-500">
          Store performance metrics and sales conversion rates
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-white border border-neutral-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-medium">Avg Order Value</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-xl font-extrabold text-blue-600">
            {currency}
            {avgOrderValue.toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
            {completedOrders.length} completed orders
          </span>
        </div>

        <div className="p-3.5 bg-white border border-neutral-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-medium">Avg Deposit Size</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-xl font-extrabold text-emerald-600">
            {currency}
            {avgDepositAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
            {approvedDeposits.length} approved deposits
          </span>
        </div>

        <div className="p-3.5 bg-white border border-neutral-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-medium">Order Fulfillment</span>
            <PieChart className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <span className="text-xl font-extrabold text-purple-600">
            {orderConversionRate}%
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
            {orders.length} total orders created
          </span>
        </div>

        <div className="p-3.5 bg-white border border-neutral-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-medium">Active Users</span>
            <Users className="w-3.5 h-3.5 text-neutral-600" />
          </div>
          <span className="text-xl font-extrabold text-neutral-900">
            {users.filter((u) => u.status === 'active').length}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">
            {users.length} total registered
          </span>
        </div>
      </div>

      {/* Top Selling Products Leaderboard */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Top Selling Digital Products
          </h4>
          <span className="text-[11px] text-neutral-400">By Revenue</span>
        </div>

        {topProducts.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">No completed order data yet.</p>
        ) : (
          <div className="space-y-2">
            {topProducts.slice(0, 5).map((prod, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-neutral-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-neutral-900 block">{prod.name}</span>
                    <span className="text-[10px] text-neutral-500">{prod.count} items sold</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-neutral-900">
                    {currency}
                    {prod.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volume Summary Comparison */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs text-xs">
        <h4 className="font-bold text-neutral-900 uppercase tracking-wide">
          Store Liquidity & Flow
        </h4>

        <div className="space-y-2 text-neutral-600">
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span>Total Deposits Approved:</span>
            <span className="font-extrabold text-emerald-600">
              {currency}
              {totalApprovedDeposits.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span>Total Purchases Completed:</span>
            <span className="font-extrabold text-blue-600">
              {currency}
              {totalCompletedSales.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span>Currently Held in Wallets:</span>
            <span className="font-extrabold text-neutral-900">
              {currency}
              {users.reduce((s, u) => s + u.balance, 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span>Affiliate Commissions Disbursed:</span>
            <span className="font-extrabold text-amber-600">
              {currency}
              {(stats?.totalCommissionsPaid || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
