-- Price label, description and a "recommended" flag for the plan cards.
alter table public.plans
  add column price_ar text check (length(price_ar) <= 60),
  add column price_en text check (length(price_en) <= 60),
  add column description_ar text check (length(description_ar) <= 300),
  add column description_en text check (length(description_en) <= 300),
  add column highlight boolean not null default false;

update public.plans set price_ar = 'مجاناً', price_en = 'Free',
  description_ar = 'للتجربة والمشاريع الشخصية الصغيرة.', description_en = 'For trying things out and small personal projects.'
where id = 'free';
update public.plans set highlight = true,
  description_ar = 'لصنّاع المحتوى والمخرجين المستقلين الذين يعملون مع فريق صغير.', description_en = 'For independent filmmakers and creators working with a small team.'
where id = 'pro';
update public.plans set
  description_ar = 'لشركات الإنتاج: مشاريع وأعضاء بلا حدود ومساحة كبيرة.', description_en = 'For production companies: unlimited projects and members, lots of storage.'
where id = 'studio';
