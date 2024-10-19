import { Router } from 'express';
const router = Router();

// Sample data to work with
let items = [
  { id: 1, name: 'Item One' },
  { id: 2, name: 'Item Two' },
];

// GET all items
router.get('/', (req, res) => {
  res.json(items);
});

// GET a single item by ID
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find(i => i.id === id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).send('Item not found');
  }
});

// POST a new item
router.post('/', (req, res) => {
  const newItem = {
    id: items.length + 1,
    name: req.body.name,
  };
  items.push(newItem);
  res.status(201).json(newItem);
});

// PUT to update an existing item by ID
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find(i => i.id === id);
  if (item) {
    item.name = req.body.name;
    res.json(item);
  } else {
    res.status(404).send('Item not found');
  }
});

// DELETE an item by ID
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).send('Item not found');
  }
});

export default router;
