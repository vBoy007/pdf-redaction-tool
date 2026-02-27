# ТЕХНИЧЕСКА ДОКУМЕНТАЦИЯ

## 🏗️ Архитектурен преглед

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React App (SPA)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Zustand   │  │   PDF.js     │  │    pdf-lib       │   │
│  │    Store    │  │  (Rendering) │  │  (Editing)       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Canvas-based Workflow                      │ │
│  │  1. PDF.js renders page to Canvas                      │ │
│  │  2. User draws redaction boxes                         │ │
│  │  3. Export: burn-in to Canvas → convert to PDF        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    100% Client-Side
                    No Backend Required
```

## 🔐 TRUE Redaction Strategy

### Проблемът с традиционните подходи

**Неефективен подход (OVERLAY ONLY):**
```javascript
// ❌ ТОВА НЕ Е TRUE REDACTION
page.drawRectangle({
  x: 100, y: 100,
  width: 200, height: 50,
  color: rgb(0, 0, 0) // просто черен правоъгълник отгоре
});
```

**Проблем**: Оригиналният текст/изображение остава в PDF структурата:
- Може да се копира с Ctrl+C
- Видим в PDF editors като Adobe Acrobat
- Извлечим с PDF parsing библиотеки

### Нашето решение (CANVAS FLATTENING)

**Secure Mode workflow:**

```javascript
// 1. Render PDF page to Canvas (high DPI)
const canvas = document.createElement('canvas');
await pdfjs.render({ pageNumber, scale: 2.0, canvas });

// 2. Draw redaction boxes DIRECTLY on canvas
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000000';
ctx.fillRect(box.x * 2, box.y * 2, box.width * 2, box.height * 2);

// 3. Convert Canvas to image
const imageData = canvas.toDataURL('image/png');

// 4. Embed image in new PDF (replacing original page)
const pdfDoc = await PDFDocument.create();
const image = await pdfDoc.embedPng(imageData);
page.drawImage(image, { x: 0, y: 0, width, height });

// Резултат: Страницата е сега ЕДНО изображение
// Няма текст слоеве, няма векторна графика
// Данните под заличенията са ФИЗИЧЕСКИ ПРЕМАХНАТИ
```

### Защо Canvas flattening е TRUE redaction?

1. **Canvas е bitmap** - не съдържа текстови/векторни данни
2. **Необратимо** - оригиналните pixels са презаписани
3. **Не може да се извлече** - няма скрити слоеве в резултата
4. **Стандартизирано** - работи във всички PDF viewers

### Trade-offs

| Аспект | Secure Mode (Canvas) | Quick Mode (Overlay) |
|--------|---------------------|---------------------|
| **Сигурност** | ✅ 100% TRUE redaction | ❌ Данните остават |
| **Размер на файл** | ❌ По-голям (PNG images) | ✅ По-малък (векторен) |
| **Качество** | ⚠️ Fixed DPI (2x) | ✅ Векторно качество |
| **Text search** | ❌ Не работи (images) | ✅ Работи |
| **Скорост** | ⚠️ По-бавно | ✅ Бързо |
| **Compliance** | ✅ GDPR/HIPAA ready | ❌ Не е достатъчно |

## 📊 State Management (Zustand)

### Защо Zustand вместо Redux?

- **По-малко boilerplate** (няма actions/reducers/middleware)
- **TypeScript-first** - native typing
- **По-добър performance** - selective re-renders
- **По-малък bundle size** (~1KB vs ~5KB Redux)

### Store структура

```typescript
interface DocumentStore {
  // Document state
  file: File | null;
  numPages: number;
  currentPage: number;
  zoom: number;
  
  // Annotations
  redactions: RedactionBox[];
  textAnnotations: TextAnnotation[];
  imageAnnotations: ImageAnnotation[];
  
  // UI state
  currentTool: ToolType;
  isProcessing: boolean;
  error: string | null;
  
  // Actions
  setFile: (file: File) => void;
  addRedaction: (box: RedactionBox) => void;
  // ... etc
}
```

### Optimizations

- **Selective subscriptions** - компонентите re-render само при промяна на нужните данни:
```typescript
// ✅ Само currentPage промените trigger re-render
const currentPage = useDocumentStore(state => state.currentPage);

// ❌ Всяка store промяна trigger re-render
const store = useDocumentStore();
```

## 🎨 Canvas Rendering Pipeline

### PDF.js Integration

```typescript
// 1. Load PDF
const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

// 2. Get page
const page = await pdfDoc.getPage(pageNumber);

// 3. Calculate viewport (with zoom)
const viewport = page.getViewport({ scale: zoom });

// 4. Render to canvas
const canvas = document.createElement('canvas');
canvas.width = viewport.width;
canvas.height = viewport.height;

await page.render({
  canvasContext: canvas.getContext('2d'),
  viewport: viewport
}).promise;
```

### Performance considerations

- **Web Workers** - PDF.js използва worker thread за parsing
- **Lazy rendering** - рендерираме само текущата страница
- **Canvas pooling** - reuse canvas elements където е възможно

## 🔒 Security & Privacy

### Client-Side Processing

**Защо всичко е client-side?**

1. **Privacy-first** - документите никога не напускат устройството
2. **GDPR compliant** - няма data processing на сървъри
3. **Zero trust** - не разчитаме на external services
4. **Offline capable** - работи без интернет след зареждане

### File validation

```typescript
// Size limit
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Type validation
if (!file.name.toLowerCase().endsWith('.pdf')) {
  throw new Error('Само PDF файлове');
}

// Magic bytes check (опционално)
const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
if (header[0] !== 0x25 || header[1] !== 0x50) { // %PDF
  throw new Error('Невалиден PDF файл');
}
```

### Memory management

```typescript
// Cleanup при unmount
useEffect(() => {
  return () => {
    pdfEngine.destroy(); // Release PDF.js resources
    URL.revokeObjectURL(fileUrl); // Free blob URLs
  };
}, []);
```

## 📦 Bundle Size Optimization

### Code splitting

```typescript
// Lazy load Export Modal
const ExportModal = lazy(() => import('@/components/ExportModal'));

// Only load when needed
{showExportModal && <Suspense><ExportModal /></Suspense>}
```

### Tree shaking

- **pdf-lib** - Import само нужните functions
- **lucide-react** - Import само нужните icons
- **Vite** - Automatic dead code elimination

### Expected bundle sizes

- **Initial load**: ~300KB (gzipped)
- **PDF.js worker**: ~400KB (loaded separately)
- **Total**: ~700KB first load

## 🧪 Testing Strategy

### Unit Tests (препоръчителни, не имплементирани)

```typescript
// redactionEngine.test.ts
describe('RedactionEngine', () => {
  it('should apply redactions in secure mode', async () => {
    const result = await redactionEngine.applyRedactions(
      mockPDFFile,
      [mockRedactionBox],
      true // secure mode
    );
    
    // Verify no text extractable under redaction
    const text = await extractTextFromPDF(result);
    expect(text).not.toContain('REDACTED_TEXT');
  });
});
```

### Integration Tests

1. **Upload flow** - File validation и PDF parsing
2. **Redaction flow** - Box creation и tracking
3. **Export flow** - PDF generation и download

### Manual QA Checklist

- [ ] Upload различни PDF типове (scanned, vector, mixed)
- [ ] Multi-page navigation
- [ ] Zoom функционалност
- [ ] Redaction box creation/deletion
- [ ] Text annotation добавяне
- [ ] Image annotation upload
- [ ] Secure Mode export
- [ ] Quick Mode export
- [ ] Verify TRUE redaction (no text extractable)
- [ ] File size reasonable
- [ ] Browser compatibility (Chrome, Firefox, Safari)

## 🚀 Performance Optimization Tips

### 1. Large PDFs

```typescript
// Render only visible pages (не цялото)
const visiblePages = [currentPage - 1, currentPage, currentPage + 1];
visiblePages.forEach(renderPage);
```

### 2. High DPI displays

```typescript
// Detect device pixel ratio
const scale = window.devicePixelRatio || 1;
canvas.width = viewport.width * scale;
canvas.height = viewport.height * scale;
ctx.scale(scale, scale);
```

### 3. Memory limits

```typescript
// For very large files, use chunked processing
const CHUNK_SIZE = 5; // pages per chunk
for (let i = 0; i < numPages; i += CHUNK_SIZE) {
  await processChunk(i, i + CHUNK_SIZE);
  // Allow GC between chunks
  await new Promise(r => setTimeout(r, 100));
}
```

## 🐛 Known Issues & Workarounds

### Issue 1: Safari Canvas limits

**Problem**: Safari has 16MB canvas size limit
**Workaround**: Reduce scale or split large pages

```typescript
const maxCanvasSize = 16 * 1024 * 1024; // 16MB
if (canvas.width * canvas.height > maxCanvasSize) {
  scale = Math.sqrt(maxCanvasSize / (width * height));
}
```

### Issue 2: Firefox memory consumption

**Problem**: Firefox може да leak memory при много re-renders
**Workaround**: Explicit canvas cleanup

```typescript
const ctx = canvas.getContext('2d', { willReadFrequently: true });
// After use:
ctx.clearRect(0, 0, canvas.width, canvas.height);
canvas.width = 0;
canvas.height = 0;
```

## 📈 Future Improvements

### 1. WebAssembly PDF Parser

Вместо PDF.js, използване на WASM-based parser (напр. PDFium) за:
- По-добър performance (5-10x)
- По-малка memory footprint
- По-добра mobile поддръжка

### 2. Service Worker Caching

За offline functionality:
```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

### 3. IndexedDB Storage

За temporary save/autosave:
```typescript
// Save work-in-progress
await db.documents.put({
  id: documentId,
  redactions: store.redactions,
  timestamp: Date.now()
});
```

### 4. Advanced Redaction Detection

ML-based signature detection:
```typescript
// Using TensorFlow.js
const model = await tf.loadLayersModel('/models/signature-detector');
const predictions = await model.predict(imageData);
const signatureBoxes = predictions.filter(p => p.confidence > 0.8);
```

## 📚 Resources

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [pdf-lib API Reference](https://pdf-lib.js.org/)
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [PDF Specification (ISO 32000)](https://www.iso.org/standard/63534.html)

---

**Въпроси? Пишете issue в GitHub или проверете README.md**
