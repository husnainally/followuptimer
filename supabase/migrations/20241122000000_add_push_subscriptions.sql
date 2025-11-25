-- Add push_subscriptions table for storing Web Push API subscriptions
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one subscription per endpoint per user
  unique(user_id, endpoint)
);

-- Create indexes for better performance
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions(endpoint);

-- Enable Row Level Security
alter table public.push_subscriptions enable row level security;

-- RLS Policies for push_subscriptions
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Add comment for documentation
comment on table public.push_subscriptions is 'Stores Web Push API subscriptions for users to receive push notifications';
comment on column public.push_subscriptions.endpoint is 'The push service endpoint URL';
comment on column public.push_subscriptions.p256dh is 'User public key for encryption';
comment on column public.push_subscriptions.auth is 'Authentication secret';

