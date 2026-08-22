insert into public.demo_scenarios (key,label,description) values
('large_dog','Large dog','Large dog matched to hold/cargo or rail options and suitable stays.'),
('small_dog','Small dog','Small dog matched to cabin-friendly and flexible stay options.'),
('cat','Cat','Cat matched to carrier-aware travel and quiet stays.'),
('special_needs','Special needs or service animal','Dog or cat requiring accessibility, medication or service-animal review.')
on conflict (key) do update set label=excluded.label, description=excluded.description;

insert into public.transport_options (id,mode,operator,pet_types,min_weight_kg,max_weight_kg,handling,supports_special_needs,supports_service_animals,verification_status,summary,scenario_keys) values
('northstar-air','air','Northstar Air (demo)',array['Dog','Cat'],0,8,'Cabin',false,true,'DEMO','Cabin-sized pets; service-animal review available.',array['small_dog','cat','special_needs']),
('coastlink-air','air','CoastLink Air (demo)',array['Dog','Cat'],8,32,'Checked hold',true,true,'DEMO','Medium and large pets with approved crate and health documents.',array['large_dog','special_needs']),
('companion-cargo','air','Companion Cargo (demo)',array['Dog','Cat'],20,60,'Cargo',true,false,'DEMO','Large-animal logistics with veterinary clearance.',array['large_dog','special_needs']),
('first-ac-coupe','rail','First AC Coupe (demo)',array['Dog','Cat'],0,null,'Private coupe',true,true,'DEMO','Private-coupe path requiring operator confirmation.',array['large_dog','small_dog','cat','special_needs']),
('private-road','road','Private road journey',array['Dog','Cat'],0,null,'Private vehicle',true,true,'CURATED','Flexible breaks and direct control of comfort.',array['large_dog','small_dog','cat','special_needs'])
on conflict (id) do update set operator=excluded.operator, summary=excluded.summary, scenario_keys=excluded.scenario_keys;

insert into public.stay_options (id,name,area,pet_types,max_weight_kg,supports_special_needs,supports_service_animals,purpose_ids,verification_status,summary) values
('garden-house','Goa Garden House (demo)','Assagao',array['Dog'],40,true,true,array['relax','family'],'DEMO','Private garden, ground-floor access and medication fridge.'),
('quiet-casa','Quiet Casa (demo)','Morjim',array['Cat','Dog'],12,true,true,array['workation','relax'],'DEMO','Quiet rooms, screened balcony and low-traffic setting.'),
('trail-lodge','Trailside Lodge (demo)','Netravali',array['Dog'],45,false,true,array['outdoor'],'DEMO','Large-dog rooms near shaded walking routes.'),
('accessible-retreat','Accessible Retreat (demo)','Panjim',array['Dog','Cat'],null,true,true,array['care','family','workation'],'DEMO','Step-free access, quiet zone and nearby veterinary support.')
on conflict (id) do update set name=excluded.name, summary=excluded.summary, purpose_ids=excluded.purpose_ids;

insert into public.purpose_options (id,label,description,scenario_keys) values
('relax','A relaxed coastal break','Low-pressure days, cooler walks and long rest windows.',array['large_dog','small_dog','cat']),
('family','A family visit','Flexible plans around a known home base.',array['large_dog','small_dog','cat','special_needs']),
('workation','A quiet workation','Quiet rooms, reliable rest and short nearby activities.',array['small_dog','cat','special_needs']),
('outdoor','An outdoor adventure','Shaded trails, recovery time and larger-dog access.',array['large_dog','small_dog']),
('care','A care-focused stay','Veterinary proximity, medication storage and accessible pacing.',array['special_needs'])
on conflict (id) do update set label=excluded.label, description=excluded.description, scenario_keys=excluded.scenario_keys;

insert into public.vaccination_requirements (id,pet_types,applies_to,vaccinations,recency_days,verification_status) values
('core-dog',array['Dog'],array['air','rail','stay'],array['Rabies','DHPP'],365,'DEMO'),
('core-cat',array['Cat'],array['air','rail','stay'],array['Rabies','FVRCP'],365,'DEMO')
on conflict (id) do update set vaccinations=excluded.vaccinations, recency_days=excluded.recency_days;
