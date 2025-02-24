-- Create the frequent_searches table
create table frequent_searches (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  search_count integer default 1,
  last_searched_at timestamptz default now(),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create an index on search_count for efficient sorting
create index idx_frequent_searches_count on frequent_searches(search_count desc);

-- Create an index on username for efficient lookups
create index idx_frequent_searches_username on frequent_searches(username);

-- Function to increment search count
create or replace function increment_search_count(p_username text, p_avatar_url text)
returns void as $$
begin
  insert into frequent_searches (username, avatar_url)
  values (p_username, p_avatar_url)
  on conflict (username) do update
  set 
    search_count = frequent_searches.search_count + 1,
    last_searched_at = now(),
    avatar_url = coalesce(p_avatar_url, frequent_searches.avatar_url),
    updated_at = now();
end;
$$ language plpgsql;

-- Add unique constraint on username
alter table frequent_searches
add constraint unique_username unique (username); 