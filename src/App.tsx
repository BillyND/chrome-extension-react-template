import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  ExternalLink,
  Download,
  Trash2,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Settings2,
} from "lucide-react";
import { generateJiraUrl, MONTHS, getYearOptions } from "@/utils/dateUtils";
import {
  ScrapeStatus,
  getStatus,
  clearData,
  exportData,
  injectScraperScript,
  saveBatchSize,
  getBatchSize,
} from "@/utils/scraper";

function App() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [batchSize, setBatchSize] = useState(5);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>({
    total: 0,
    processed: 0,
    status: "idle",
  });
  const [isLoading, setIsLoading] = useState(false);

  const yearOptions = getYearOptions();

  // Load saved settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      // Load batch size
      const savedBatchSize = await getBatchSize();
      setBatchSize(savedBatchSize);
      
      // Load saved month/year
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['savedMonth', 'savedYear']);
        if (result.savedMonth) setMonth(result.savedMonth);
        if (result.savedYear) setYear(result.savedYear);
      } else {
        // Fallback to localStorage for dev
        const savedMonth = localStorage.getItem('savedMonth');
        const savedYear = localStorage.getItem('savedYear');
        if (savedMonth) setMonth(parseInt(savedMonth));
        if (savedYear) setYear(parseInt(savedYear));
      }
    };
    
    loadSettings();
  }, []);

  // Auto-generate URL when month/year changes
  useEffect(() => {
    const url = generateJiraUrl(month, year);
    setGeneratedUrl(url);
    
    // Save month/year to storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ savedMonth: month, savedYear: year });
    } else {
      localStorage.setItem('savedMonth', month.toString());
      localStorage.setItem('savedYear', year.toString());
    }
  }, [month, year]);

  // Check scrape status periodically
  useEffect(() => {
    const checkStatus = async () => {
      const status = await getStatus();
      setScrapeStatus(status);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenJira = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // Use Chrome API to open tab
      chrome.tabs.create({ url: generatedUrl });
    } else {
      // Fallback for development
      window.open(generatedUrl, "_blank");
    }
  };

  const handleStartScraping = async () => {
    setIsLoading(true);

    console.log("handleStartScraping with batch size:", batchSize);

    try {
      await injectScraperScript(batchSize);
    } catch (error) {
      console.error("Error starting scraper:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchSizeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      const newSize = Math.min(20, Math.max(1, value));
      setBatchSize(newSize);
      // Save to storage
      await saveBatchSize(newSize);
      console.log('Saved batch size:', newSize);
    }
  };

  const handleExportData = async () => {
    await exportData();
  };

  const handleClearData = async () => {
    if (confirm("Xóa tất cả dữ liệu đã thu thập?")) {
      await clearData();
      const status = await getStatus();
      setScrapeStatus(status);
    }
  };

  const getStatusIcon = () => {
    switch (scrapeStatus.status) {
      case "running":
        return <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (scrapeStatus.status) {
      case "running":
        return `Đang xử lý: ${scrapeStatus.processed}/${scrapeStatus.total}`;
      case "completed":
        return `Hoàn thành: ${scrapeStatus.processed} issues`;
      case "error":
        return "Có lỗi xảy ra";
      default:
        return "Chưa bắt đầu";
    }
  };

  return (
    <div className="w-[450px] min-h-[600px] p-4 bg-background">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sync Jira Work
          </CardTitle>
          <CardDescription>
            Tự động tạo URL và thu thập dữ liệu từ Jira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Tháng</label>
                <Select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Năm</label>
                <Select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Generated URL */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">URL đã tạo:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenJira}
                className="h-8"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Mở Jira
              </Button>
            </div>
            <p className="text-xs text-muted-foreground break-all">
              {generatedUrl.substring(0, 100)}...
            </p>
          </div>

          {/* Scraping Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Thu thập dữ liệu</h3>

            {/* Batch Size Setting */}
            <div className="mb-3 p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium flex-1">
                  Số issue xử lý / lần:
                </label>
                <Input
                  type="number"
                  value={batchSize}
                  onChange={handleBatchSizeChange}
                  min="1"
                  max="20"
                  className="w-20 h-8 text-center"
                  disabled={scrapeStatus.status === "running"}
                />
                <span className="text-xs text-muted-foreground">(1-20)</span>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-lg border p-3 mb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="text-sm">{getStatusText()}</span>
                </div>
                {scrapeStatus.lastUpdate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(scrapeStatus.lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {scrapeStatus.status === "running" && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          (scrapeStatus.processed / scrapeStatus.total) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleStartScraping}
                disabled={isLoading || scrapeStatus.status === "running"}
                className="w-full"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Bắt đầu Scrape
              </Button>

              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={scrapeStatus.processed === 0}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>

            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={scrapeStatus.processed === 0}
              className="w-full mt-2"
              size="sm"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Xóa dữ liệu
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
            <p>📌 Hướng dẫn sử dụng:</p>
            <ol className="ml-3 space-y-0.5">
              <li>1. Chọn tháng và năm cần lấy dữ liệu</li>
              <li>2. Click "Mở Jira" để mở trang với URL đã tạo</li>
              <li>3. Đợi trang Jira load xong</li>
              <li>4. Click "Bắt đầu Scrape" để thu thập dữ liệu</li>
              <li>5. Export dữ liệu khi hoàn thành</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
