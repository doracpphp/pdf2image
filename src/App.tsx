import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import "./App.css";

// PDF.js workerの設定
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// 日本語フォント用のcMap設定（末尾スラッシュ必須）
const CMAP_URL = "/cmaps/";
const STANDARD_FONT_DATA_URL = "/standard_fonts/";

interface PageImage {
  pageNumber: number;
  dataUrl: string;
}

function App() {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<PageImage | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdf = useCallback(async (file: File) => {
    setError(null);
    setPageImages([]);
    setIsProcessing(true);
    setProgress(0);
    setFileName(file.name.replace(/\.pdf$/i, ""));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: CMAP_URL,
        cMapPacked: true,
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
      }).promise;
      const images: PageImage[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const scale = 2; // 高解像度でレンダリング
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error(t("error.canvasContext"));
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        const dataUrl = canvas.toDataURL("image/png");
        images.push({ pageNumber: pageNum, dataUrl });
        setProgress(Math.round((pageNum / pdf.numPages) * 100));
      }

      setPageImages(images);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("error.processingFailed")
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          processPdf(file);
        } else {
          setError(t("error.selectPdf"));
        }
      }
    },
    [processPdf, t]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          processPdf(file);
        } else {
          setError(t("error.selectPdf"));
        }
      }
    },
    [processPdf, t]
  );

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const downloadImage = useCallback(
    (pageImage: PageImage) => {
      const link = document.createElement("a");
      link.href = pageImage.dataUrl;
      link.download = `${fileName}_page${pageImage.pageNumber}.png`;
      link.click();
    },
    [fileName]
  );

  const downloadAllAsZip = useCallback(async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      for (const pageImage of pageImages) {
        // dataURLからbase64部分を抽出
        const base64Data = pageImage.dataUrl.split(",")[1];
        zip.file(`${fileName}_page${pageImage.pageNumber}.png`, base64Data, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_images.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(t("error.zipFailed"));
    } finally {
      setIsZipping(false);
    }
  }, [pageImages, fileName, t]);

  const openModal = useCallback((pageImage: PageImage) => {
    setSelectedImage(pageImage);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }, [closeModal]);

  return (
    <div className="app">
      <LanguageSwitcher />
      <h1>{t("title")}</h1>
      <p className="subtitle">{t("subtitle")}</p>

      <div
        className={`drop-zone ${isDragging ? "dragging" : ""} ${isProcessing ? "processing" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        {isProcessing ? (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>{t("processing.converting", { progress })}</p>
          </div>
        ) : (
          <>
            <div className="drop-icon">📄</div>
            <p>
              {t("dropzone.instruction")}
              <br />
              {t("dropzone.or")}<span className="link">{t("dropzone.clickToSelect")}</span>
            </p>
          </>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {pageImages.length > 0 && (
        <div className="results">
          <div className="results-header">
            <h2>{t("results.title", { count: pageImages.length })}</h2>
            {pageImages.length > 1 && (
              <button
                className="download-all-btn"
                onClick={downloadAllAsZip}
                disabled={isZipping}
              >
                {isZipping ? t("results.creatingZip") : t("results.downloadZip")}
              </button>
            )}
          </div>
          <div className="page-grid">
            {pageImages.map((pageImage) => (
              <div key={pageImage.pageNumber} className="page-card">
                <div className="page-thumbnail" onClick={() => openModal(pageImage)}>
                  <img
                    src={pageImage.dataUrl}
                    alt={`Page ${pageImage.pageNumber}`}
                  />
                  <div className="zoom-overlay">
                    <span className="zoom-icon">🔍</span>
                  </div>
                </div>
                <div className="page-info">
                  <span>{t("results.page", { number: pageImage.pageNumber })}</span>
                  <button onClick={() => downloadImage(pageImage)}>
                    {t("results.download")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>
            <img
              src={selectedImage.dataUrl}
              alt={`Page ${selectedImage.pageNumber}`}
            />
            <div className="modal-footer">
              <span>{t("results.page", { number: selectedImage.pageNumber })}</span>
              <button onClick={() => downloadImage(selectedImage)}>
                {t("results.download")}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <a href="https://frees.jp" target="_blank" rel="noopener noreferrer">
          frees.jp
        </a>
      </footer>
    </div>
  );
}

export default App;
