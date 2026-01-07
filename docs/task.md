# Outfit Builder v2 - Proper Architecture Redesign

## Current Status: Planning

## Tasks

### Phase 1: Planning & Design
- [x] Research state-of-the-art outfit builders
- [x] Create implementation plan for v2 architecture
- [x] Get user approval on design

### Phase 2: Data Layer Enhancements
- [/] Add `outfit_category` field to product schema
- [ ] Create category normalization mapping
- [ ] Re-embed products with outfit-aware prompts
- [ ] Add compatibility metadata at index time

### Phase 3: Vector Search Layer
- [x] Implement category-constrained ANN search
- [x] Add type-prefixed embeddings for category-aware retrieval
- [x] Create outfit compatibility index

### Phase 4: Outfit Builder Agent Refactor
- [x] Replace text search with category-constrained vector search
- [x] Remove hacky keyword expansion and type expansion
- [x] Implement proper compatibility scoring
- [x] Add budget allocation per category

### Phase 5: Verification & Testing
- [ ] Test outfit generation end-to-end
- [ ] Verify all categories (tops, bottoms, shoes) return items
- [ ] Validate budget constraints per outfit
