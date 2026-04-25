---
name: dashboard-glass-redesign
description: لوحة التحكم بتصميم زجاجي عصري — هيدر glassmorphism بترحيب شخصي، شريط KPIs مدمج، أولوية الحضور والأداء
type: design
---
# لوحة التحكم — التصميم الزجاجي

## المكونات
- `GlassDashboardHeader.tsx`: هيدر بطبقات aurora (تدرجات + blobs مضببة) فوقها backdrop-blur. يعرض ترحيب شخصي حسب الوقت + اسم المعلم من profiles + شارة باقة + شيبس (يوم/تاريخ/هجري/أسبوع/امتحان) + دائرة نسبة حضور بـ SVG.
- `GlassStatStrip.tsx`: 5 بطاقات مدمجة أفقية (حاضر/غائب/متأخر/طلاب/فصول) بأيقونات ملونة وtinted blobs.

## ترتيب الويدجات الافتراضي (DEFAULT_ORDER)
1. attendanceAndComparison (الحضور أولاً)
2. performanceDashboard (الأداء)
3. widgetGrid (جدول اليوم/دروس الأسبوع/التقويم)
4. fullTimetable
5. smartSummary
6. honorRoll

## المكونات القديمة المهجورة
`DashboardHeader.tsx` و `DashboardStatCards.tsx` لم تعد مستخدمة في DashboardPage لكن باقية في الكود لو احتاج المستخدم العودة.
