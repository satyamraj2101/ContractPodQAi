import { FileText, Download, Eye, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface DocumentCardProps {
  id: string;
  filename: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  onView?: () => void;
  onDownload?: () => void;
}

export function DocumentCard({
  id,
  filename,
  fileType,
  fileSize,
  uploadDate,
  onView,
  onDownload,
}: DocumentCardProps) {
  return (
    <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-document-${id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate mb-1" data-testid={`text-filename-${id}`}>
            {filename}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span data-testid={`text-upload-date-${id}`}>{uploadDate}</span>
            <span>•</span>
            <span data-testid={`text-file-size-${id}`}>{fileSize}</span>
          </div>
          <Badge variant="secondary" className="mt-2 text-xs" data-testid={`badge-file-type-${id}`}>
            {fileType}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-document-menu-${id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView} data-testid={`button-view-${id}`}>
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload} data-testid={`button-download-${id}`}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
