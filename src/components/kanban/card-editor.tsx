import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import type { RepairCard, RepairStatus } from "@/lib/repair-types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/repair-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: RepairCard | null;
  defaultStatus?: RepairStatus;
  onSaved: () => void;
}

export function CardEditor({ open, onOpenChange, card, defaultStatus, onSaved }: Props) {
  const [clientName, setClientName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [description, setDescription] = useState("");
  const [artLink, setArtLink] = useState("");
  const [attendantName, setAttendantName] = useState("");
  const [status, setStatus] = useState<RepairStatus>("todo");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientName(card?.client_name ?? "");
      setOrderNumber(card?.order_number ?? "");
      setDescription(card?.description ?? "");
      setArtLink(card?.art_link ?? "");
      setAttendantName(card?.attendant_name ?? "");
      setStatus(card?.status ?? defaultStatus ?? "todo");
      setImageUrl(card?.image_url ?? null);
    }
  }, [open, card, defaultStatus]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("repair-images").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("repair-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      setImageUrl(data?.signedUrl ?? null);
      toast.success("Imagem enviada");
    } catch (err: any) {
      toast.error("Falha ao enviar imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!clientName || !orderNumber || !description || !attendantName) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_name: clientName,
        order_number: orderNumber,
        description,
        art_link: artLink || null,
        attendant_name: attendantName,
        image_url: imageUrl,
        status,
      };
      if (card) {
        const { error } = await supabase.from("repair_cards").update(payload).eq("id", card.id);
        if (error) throw error;
        toast.success("Cartão atualizado");
      } else {
        const { error } = await supabase.from("repair_cards").insert(payload);
        if (error) throw error;
        toast.success("Cartão criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card ? "Editar Conserto" : "Novo Conserto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label>Nº do Pedido *</Label>
              <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Descrição do Conserto *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Link da Arte</Label>
            <Input value={artLink} onChange={(e) => setArtLink(e.target.value)} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Conferente *</Label>
              <Input value={attendantName} onChange={(e) => setAttendantName(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RepairStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Imagem (opcional)</Label>
            {imageUrl ? (
              <div className="relative mt-1">
                <img src={imageUrl} alt="anexo" className="rounded-md max-h-48 w-full object-cover border" />
                <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-7 w-7"
                  onClick={() => setImageUrl(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 mt-1 border-2 border-dashed rounded-md p-4 cursor-pointer hover:bg-muted/50 transition">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Enviando..." : "Clique para enviar uma imagem"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
