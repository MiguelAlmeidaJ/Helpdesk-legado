export interface TicketProjectTaskImage {
  id: number;
  name: string;
  mimeType: 'image/jpeg';
  updatedAt: string | null;
  uploadedBy: {
    id: number | null;
    name: string | null;
  };
}

export interface TicketProjectTaskImagesResponse {
  images: TicketProjectTaskImage[];
}
