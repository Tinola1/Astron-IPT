import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, MenuItem, Paper, Slider, Stack, TextField, Typography } from '@mui/material';
import { setFilters, resetFilters } from '../../store/actions/productActions';
import useDebounce from '../../hooks/useDebounce';
import { BTU_OPTIONS, PRICE_MAX, PRICE_MIN } from '../../utils/constants';
import { peso } from '../../utils/format';

function FilterSelect({ label, value, onChange, children }) {
  return (
    <TextField select size="small" fullWidth label={label} value={value} onChange={onChange}>
      {children}
    </TextField>
  );
}

const toRange = (f) => [
  f.minPrice === '' ? PRICE_MIN : Number(f.minPrice),
  f.maxPrice === '' ? PRICE_MAX : Number(f.maxPrice),
];

export default function ProductFilters() {
  const dispatch = useDispatch();
  const { filters, categories, brands } = useSelector((s) => s.products);

  // search box: local state + debounce so we don't hit the API on every keystroke
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebounce(search, 400);
  useEffect(() => {
    if (debouncedSearch !== filters.q) dispatch(setFilters({ q: debouncedSearch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  useEffect(() => setSearch(filters.q), [filters.q]); // keeps the box in sync on reset

  // price slider: local while dragging, committed on release
  const [range, setRange] = useState(toRange(filters));
  useEffect(() => setRange(toRange(filters)), [filters.minPrice, filters.maxPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitRange = (_, [lo, hi]) =>
    dispatch(setFilters({ minPrice: lo === PRICE_MIN ? '' : lo, maxPrice: hi === PRICE_MAX ? '' : hi }));

  const on = (name) => (e) => dispatch(setFilters({ [name]: e.target.value }));

  return (
    <Paper sx={{ p: 2, position: { md: 'sticky' }, top: { md: 80 } }}>
      <Stack spacing={2}>
        <Typography fontWeight={700}>Filters</Typography>

        <TextField size="small" fullWidth label="Search model or name" value={search} onChange={(e) => setSearch(e.target.value)} />

        <FilterSelect label="Type" value={filters.category} onChange={on('category')}>
          <MenuItem value="">All types</MenuItem>
          {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
        </FilterSelect>

        <FilterSelect label="Brand" value={filters.brand} onChange={on('brand')}>
          <MenuItem value="">All brands</MenuItem>
          {brands.map((b) => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
        </FilterSelect>

        <FilterSelect label="Capacity" value={filters.btu} onChange={on('btu')}>
          <MenuItem value="">Any capacity</MenuItem>
          {BTU_OPTIONS.map((b) => <MenuItem key={b} value={String(b)}>{b.toLocaleString()} BTU</MenuItem>)}
        </FilterSelect>

        <FilterSelect label="Inverter" value={filters.inverter} onChange={on('inverter')}>
          <MenuItem value="">Inverter or not</MenuItem>
          <MenuItem value="true">Inverter</MenuItem>
          <MenuItem value="false">Non-inverter</MenuItem>
        </FilterSelect>

        <FilterSelect label="Energy rating" value={filters.energy} onChange={on('energy')}>
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="5">5 stars</MenuItem>
          <MenuItem value="4">4+ stars</MenuItem>
          <MenuItem value="3">3+ stars</MenuItem>
        </FilterSelect>

        <div>
          <Typography variant="body2" gutterBottom>
            Price: {peso(range[0])} – {range[1] === PRICE_MAX ? `${peso(PRICE_MAX)}+` : peso(range[1])}
          </Typography>
          <Slider
            value={range}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={1000}
            onChange={(_, v) => setRange(v)}
            onChangeCommitted={commitRange}
            valueLabelDisplay="off"
          />
        </div>

        <FilterSelect label="Customer rating" value={filters.rating} onChange={on('rating')}>
          <MenuItem value="">Any rating</MenuItem>
          <MenuItem value="4">4★ & up</MenuItem>
          <MenuItem value="3">3★ & up</MenuItem>
          <MenuItem value="2">2★ & up</MenuItem>
        </FilterSelect>

        <FilterSelect label="Number of reviews" value={filters.minReviews} onChange={on('minReviews')}>
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="1">1+ reviews</MenuItem>
          <MenuItem value="5">5+ reviews</MenuItem>
          <MenuItem value="10">10+ reviews</MenuItem>
        </FilterSelect>

        <Button variant="outlined" onClick={() => dispatch(resetFilters())}>Clear filters</Button>
      </Stack>
    </Paper>
  );
}