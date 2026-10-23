---
title: リリース指標
display:
  decimals: 1
---
# リリース指標
// この前提値はrevenue.csvに対応しています。値を変えると、関連する計算結果が更新されます。

## 売上
january_revenue = 43400 -> currency(USD, 0)
june_revenue = 82600 -> currency(USD, 0)
six_month_total = 43400 + 48900 + 55400 + 63500 + 72500 + 82600 -> currency(USD, 0)
average_monthly_revenue = six_month_total / 6 -> currency(USD, 0)
six_month_growth = (june_revenue / january_revenue) - 1 -> percent(1)

## リリース目標
launch_target = 85000 -> currency(USD, 0)
target_gap = launch_target - june_revenue -> currency(USD, 0)
target_attainment = june_revenue / launch_target -> percent(1)

## 顧客の増加
january_new_customers = 18
june_new_customers = 39
customer_growth = (june_new_customers / january_new_customers) - 1 -> percent(1)
revenue_per_new_customer = june_revenue / june_new_customers -> currency(USD, 0)

## 準備状況の確認
assert june_revenue > january_revenue
assert target_gap > 0
assert target_attainment > 0.9
