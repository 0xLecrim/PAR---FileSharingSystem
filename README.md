# System Rozproszonej Wymiany Plików

Rozproszony system składający się z serwera oraz dwóch klientów (webowego i CLI) do zarządzania i udostępniania plików.

## Architektura Systemu

System składa się z trzech głównych komponentów:

1. **Serwer**
   - Zarządza przechowywaniem i obsługą plików
   - Udostępnia interfejsy HTTP/WebSocket oraz gRPC
   - Wykorzystuje przechowywanie w pamięci z persystencją w systemie plików
   - Obsługuje równoczesny dostęp wielu klientów

2. **Klient Webowy**
   - Zbudowany przy użyciu Next.js i React
   - Komunikacja przez HTTP dla operacji na plikach
   - Aktualizacje w czasie rzeczywistym przez WebSocket
   - Nowoczesny interfejs użytkownika z Tailwind CSS

3. **Klient CLI**
   - Zbudowany w TypeScript
   - Komunikacja przez gRPC
   - Interfejs wiersza poleceń do operacji na plikach

## Protokoły Komunikacyjne

### HTTP/WebSocket (Klient Webowy)

- **Endpointy REST API**:
  - `POST /api/files` - Przesyłanie pliku
  - `GET /api/files` - Lista plików
  - `GET /api/files/:fileId` - Pobieranie pliku
  - `DELETE /api/files/:fileId` - Usuwanie pliku

- **WebSocket**:
  - Aktualizacje listy plików w czasie rzeczywistym
  - Serwer wysyła aktualizacje przy dodawaniu/usuwaniu plików

### gRPC (Klient CLI)

- **Usługi**:
  - `UploadFile` - Strumieniowe przesyłanie plików
  - `DownloadFile` - Strumieniowe pobieranie plików
  - `ListFiles` - Pobieranie listy dostępnych plików
  - `DeleteFile` - Usuwanie plików z serwera

## Użyte Technologie

- **Serwer**:
  - Node.js z TypeScript
  - Express.js dla API HTTP
  - WebSocket dla aktualizacji w czasie rzeczywistym
  - gRPC dla komunikacji z klientem CLI
  - Multer do obsługi przesyłania plików

- **Klient Webowy**:
  - Next.js 15
  - React 19
  - Tailwind CSS
  - Klient WebSocket

- **Klient CLI**:
  - TypeScript
  - Klient gRPC
  - Interfejs wiersza poleceń

## Instalacja i Uruchomienie

1. Instalacja zależności:
   ```bash
   npm install
   cd server && npm install
   cd ../web-client && npm install
   cd ../cli-client && npm install
   ```

2. Uruchomienie serwera i klienta webowego:
   ```bash
   npm run dev
   ```
   - Interfejs webowy dostępny pod: http://localhost:3000
   - Serwer HTTP/WebSocket: port 3005
   - Serwer gRPC: port 50051

3. Używanie klienta CLI:
   ```bash
   # Przesyłanie pliku
   npm run cli -- upload <ścieżka_do_pliku>

   # Pobieranie pliku
   npm run cli -- download <id_pliku>

   # Lista plików
   npm run cli -- list

   # Usuwanie pliku (interaktywne)
   npm run cli -- delete
   ```

## Szczegóły Implementacji

### Serwer

- Wykorzystuje wspólny interfejs przechowywania plików
- Aktualnie używa przechowywania w pamięci z zapisem plików na dysku
- Obsługuje równoczesny dostęp do plików
- Zapewnia aktualizacje w czasie rzeczywistym przez WebSocket
- Obsługuje strumieniowe przesyłanie dużych plików przez gRPC

### Klient Webowy

- Nowoczesna aplikacja React z renderowaniem po stronie serwera
- Aktualizacje w czasie rzeczywistym bez odpytywania
- Przeciągnij i upuść pliki
- Wskaźniki postępu dla przesyłania/pobierania
- Responsywny design

### Klient CLI

- Interaktywny interfejs wiersza poleceń
- Wsparcie dla strumieniowego przesyłania dużych plików
- Paski postępu dla przesyłania/pobierania
- Podpowiedzi i pomoc w konsoli

## Obsługa Błędów

- Właściwa obsługa błędów dla operacji na plikach
- Obsługa problemów z siecią
- Walidacja typów i rozmiarów plików
- Czyszczenie niekompletnych przesyłań

## Bezpieczeństwo

- Konfiguracja CORS dla klienta webowego
- Walidacja typów plików
- Limity rozmiaru przesyłanych plików
- Unikalne identyfikatory plików

## Możliwe Rozszerzenia

- Uwierzytelnianie i autoryzacja
- Trwałe przechowywanie w bazie danych
- Wyszukiwanie po metadanych plików
- Linki do udostępniania plików
- Kompresja plików
- Szyfrowanie end-to-end
