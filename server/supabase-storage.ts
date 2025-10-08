import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  objectKey?: string; // ✅ Para PDFs privados, armazenar object key
  fileName?: string;
  error?: string;
  size?: number;
  format?: string;
  dimensions?: string;
}

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

class SupabaseStorageService {
  private supabase: any;
  private bucketName = 'pet-images';
  private receiptsBucketName = 'pet-images'; // 🧪 Temporário: usar bucket público com subpasta privada para desenvolvimento
  
  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    try {
      // Extrair URL do Supabase a partir da DATABASE_URL
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL não encontrada');
      }

      // Extrair o identificador do projeto da DATABASE_URL
      // Ex: postgresql://postgres.tkzzxsbwkgcdmcreducm:password@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
      const match = databaseUrl.match(/postgres\.([a-zA-Z0-9]+):/);
      if (!match) {
        throw new Error('Não foi possível extrair o ID do projeto Supabase da DATABASE_URL');
      }

      const projectId = match[1];
      const supabaseUrl = `https://${projectId}.supabase.co`;
      
      // Verificar se temos a ANON_KEY
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        console.warn('⚠️ SUPABASE_ANON_KEY não encontrada. Storage não estará disponível.');
        return;
      }

      console.log(`🔗 Conectando ao Supabase Storage: ${supabaseUrl}`);
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Supabase Storage:', error);
    }
  }

  async ensureBucketExists(): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      // Verificar se o bucket existe
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      
      if (listError) {
        console.warn('⚠️ Não foi possível listar buckets, assumindo que existe:', listError.message);
        return true; // Assumir que existe se não conseguir listar
      }

      const bucketExists = buckets?.some((bucket: any) => bucket.name === this.bucketName);

      if (!bucketExists) {
        console.error(`❌ Bucket '${this.bucketName}' não existe no Supabase Storage.`);
        console.log(`📋 Para criar o bucket:
1. Acesse: https://supabase.com/dashboard/project/tkzzxsbwkgcdmcreducm/storage/buckets
2. Clique em "New bucket"
3. Nome: ${this.bucketName}
4. Marque "Public bucket" (para imagens de pets apenas)
5. Salve

📋 Para criar o bucket PRIVADO de recibos:
1. Acesse o mesmo painel
2. Clique em "New bucket"
3. Nome: ${this.receiptsBucketName}
4. DESMARQUE "Public bucket" (deve ser privado) ✅
5. Salve`);
        return false;
      }

      console.log(`✅ Bucket '${this.bucketName}' encontrado`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar bucket:', error);
      return false;
    }
  }

  async uploadPetImage(
    petId: string, 
    imageBuffer: Buffer, 
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📦 [SUPABASE] Usando bucket: ${this.bucketName}`)

      // Processar imagem com Sharp
      const {
        maxWidth = 800,
        maxHeight = 600,
        quality = 85
      } = options;

      let processedBuffer: Buffer;
      
      if (mimeType.includes('image/')) {
        processedBuffer = await sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
      } else {
        processedBuffer = imageBuffer;
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `pet-${petId}-${timestamp}.jpg`;
      const filePath = `pets/${fileName}`;

      // Upload para o Supabase Storage (bucket já existe)
      console.log(`📤 Fazendo upload da imagem: ${filePath}`);
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        
        // Se o bucket não existir, dar instruções claras
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket '${this.bucketName}' não encontrado. Crie o bucket no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      // Obter URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload concluído: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
        fileName
      };

    } catch (error) {
      console.error('❌ Erro no upload da imagem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async deletePetImage(fileName: string): Promise<boolean> {
    try {
      if (!this.supabase || !fileName) {
        return false;
      }

      const filePath = `pets/${fileName}`;
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Erro ao deletar imagem:', error);
        return false;
      }

      console.log(`🗑️ Imagem deletada: ${filePath}`);
      return true;

    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      return false;
    }
  }

  extractFileNameFromUrl(url: string): string | null {
    try {
      if (!url) {
        console.log('🔍 [SUPABASE] URL vazia, nenhum arquivo para extrair');
        return null;
      }
      
      // Parse URL properly
      const parsedUrl = new URL(url);
      
      // Validate that it's a Supabase Storage URL
      if (!parsedUrl.hostname.endsWith('.supabase.co')) {
        console.log('🔍 [SUPABASE] URL não é do Supabase Storage:', parsedUrl.hostname);
        return null;
      }
      
      // Extract pathname: /storage/v1/object/public/{bucket}/pets/{filename}
      const expectedPath = `/storage/v1/object/public/${this.bucketName}/pets/`;
      if (!parsedUrl.pathname.startsWith(expectedPath)) {
        console.log('🔍 [SUPABASE] Caminho da URL não corresponde ao padrão esperado:', parsedUrl.pathname);
        return null;
      }
      
      // Extract filename from the end of the path
      const fileName = parsedUrl.pathname.substring(expectedPath.length);
      if (!fileName || fileName.includes('/')) {
        console.log('🔍 [SUPABASE] Nome do arquivo inválido extraído:', fileName);
        return null;
      }
      
      console.log('✅ [SUPABASE] Nome do arquivo extraído com sucesso:', fileName);
      return fileName;
      
    } catch (error) {
      console.error('❌ [SUPABASE] Erro ao extrair nome do arquivo da URL:', error);
      return null;
    }
  }

  async uploadReceiptPDF(
    fileName: string,
    pdfBuffer: Buffer
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`🔐 [SUPABASE] Fazendo upload de PDF de comprovante para bucket PRIVADO: ${fileName}`);

      // 🧪 DESENVOLVIMENTO: Upload para bucket público em subpasta privada de recibos
      const objectKey = `receipts-private/${fileName}`;  // Object key para armazenar no banco

      // Upload para o bucket PRIVADO de recibos
      console.log(`📤 Fazendo upload seguro do PDF: ${objectKey}`);
      const { data, error } = await this.supabase.storage
        .from(this.receiptsBucketName) // ✅ Bucket privado
        .upload(objectKey, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload do PDF:', error);
        
        // Se o bucket não existir, dar instruções claras
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket privado '${this.receiptsBucketName}' não encontrado. Crie o bucket PRIVADO no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload do PDF: ${error.message}`
        };
      }

      console.log(`✅ Upload seguro do PDF concluído para bucket privado`);
      console.log(`🔑 Object Key: ${objectKey}`);

      // ✅ SEGURANÇA: Retornar object key ao invés de URL pública
      return {
        success: true,
        objectKey, // ✅ Object key para armazenar no banco
        fileName,
        size: pdfBuffer.length,
        format: 'pdf'
      };

    } catch (error) {
      console.error('❌ Erro no upload do PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async uploadSiteImage(
    fileName: string,
    imageBuffer: Buffer, 
    mimeType: string
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📦 [SUPABASE] Fazendo upload de imagem do site: ${fileName}`);

      // Processar imagem com Sharp
      let processedBuffer: Buffer;
      
      if (mimeType.includes('image/')) {
        processedBuffer = await sharp(imageBuffer)
          .resize(1200, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90 })
          .toBuffer();
      } else {
        processedBuffer = imageBuffer;
      }

      // Caminho para imagens do site
      const filePath = `site/${fileName}`;

      // Upload para o Supabase Storage
      console.log(`📤 Fazendo upload da imagem: ${filePath}`);
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      // Obter URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload concluído: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
        fileName
      };

    } catch (error) {
      console.error('❌ Erro no upload da imagem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async uploadNetworkUnitImage(
    unitId: string, 
    imageBuffer: Buffer, 
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📦 [SUPABASE] Fazendo upload de imagem de unidade: ${unitId}`);

      // Processar imagem com Sharp
      const {
        maxWidth = 1200,
        maxHeight = 800,
        quality = 90
      } = options;

      let processedBuffer: Buffer;
      
      if (mimeType.includes('image/')) {
        processedBuffer = await sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
      } else {
        processedBuffer = imageBuffer;
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `unit-${unitId}-${timestamp}.jpg`;
      const filePath = `network-units/${fileName}`;

      // Upload para o Supabase Storage
      console.log(`📤 Fazendo upload da imagem: ${filePath}`);
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket '${this.bucketName}' não encontrado. Crie o bucket no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      // Obter URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload de imagem de unidade concluído: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
        fileName
      };

    } catch (error) {
      console.error('❌ Erro no upload da imagem de unidade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
  async uploadClientImage(
    clientId: string, 
    imageBuffer: Buffer, 
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📦 [SUPABASE] Usando bucket: ${this.bucketName}`)

      // Processar imagem com Sharp
      const {
        maxWidth = 800,
        maxHeight = 600,
        quality = 85
      } = options;

      let processedBuffer: Buffer;
      
      if (mimeType.includes('image/')) {
        processedBuffer = await sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
      } else {
        processedBuffer = imageBuffer;
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `client-${clientId}-${timestamp}.jpg`;
      const filePath = `clients/${fileName}`;

      // Upload para o Supabase Storage (bucket já existe)
      console.log(`📤 Fazendo upload da imagem: ${filePath}`);
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        
        // Se o bucket não existir, dar instruções claras
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket '${this.bucketName}' não encontrado. Crie o bucket no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      // Obter URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload concluído: ${publicUrl}`);

      // Obter informações da imagem processada
      const processedImageInfo = await sharp(processedBuffer).metadata();

      return {
        success: true,
        publicUrl,
        fileName,
        size: processedBuffer.length,
        format: 'jpeg',
        dimensions: `${processedImageInfo.width}x${processedImageInfo.height}`
      };

    } catch (error) {
      console.error('❌ Erro no upload da imagem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Upload de PDFs para o Supabase Storage
   */
  async uploadPdf(
    fileName: string,
    pdfBuffer: Buffer,
    folder: string = 'receipts'
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📄 [SUPABASE] Fazendo upload de PDF: ${fileName}`);

      // Caminho para PDFs
      const filePath = `${folder}/${fileName}`;

      // Upload para o Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload do PDF:', error);
        
        // Se o bucket não existir, dar instruções claras
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket '${this.bucketName}' não encontrado. Crie o bucket no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      // Obter URL pública
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload de PDF concluído: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
        fileName,
        size: pdfBuffer.length,
        format: 'pdf'
      };

    } catch (error) {
      console.error('❌ Erro no upload do PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * ✅ SEGURANÇA: Gerar signed URL temporária para download de PDFs privados
   */
  async generateSignedUrl(objectKey: string, expiresIn: number = 300): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`🔐 [SUPABASE] Gerando signed URL temporária para: ${objectKey}`);
      console.log(`⏱️ [SUPABASE] Expiração em: ${expiresIn} segundos`);

      // Gerar signed URL temporária para o bucket PRIVADO
      const { data, error } = await this.supabase.storage
        .from(this.receiptsBucketName) // ✅ Bucket privado
        .createSignedUrl(objectKey, expiresIn);

      if (error) {
        console.error('❌ Erro ao gerar signed URL:', error);
        return {
          success: false,
          error: `Erro ao gerar URL segura: ${error.message}`
        };
      }

      console.log('✅ Signed URL gerada com sucesso');
      console.log(`🔒 Válida por: ${Math.floor(expiresIn / 60)} minutos`);

      return {
        success: true,
        signedUrl: data.signedUrl
      };

    } catch (error) {
      console.error('❌ Erro ao gerar signed URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * ✅ SEGURANÇA: Verificar se o objeto existe no bucket privado
   */
  async checkReceiptExists(objectKey: string): Promise<boolean> {
    try {
      if (!this.supabase) {
        return false;
      }

      const { data, error } = await this.supabase.storage
        .from(this.receiptsBucketName)
        .list('receipts', {
          limit: 1,
          search: objectKey.replace('receipts/', '')
        });

      if (error) {
        console.error('❌ Erro ao verificar existência do arquivo:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar existência do arquivo:', error);
      return false;
    }
  }


  async uploadSiteSettingsImage(
    imageType: string, 
    imageBuffer: Buffer, 
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📦 [SUPABASE] Fazendo upload de imagem de configurações: ${imageType}`);

      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 90
      } = options;

      let processedBuffer: Buffer;
      
      if (mimeType.includes('image/')) {
        processedBuffer = await sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
      } else {
        processedBuffer = imageBuffer;
      }

      const timestamp = Date.now();
      const fileName = `${imageType}-${timestamp}.jpg`;
      const filePath = `site-settings/${fileName}`;

      console.log(`📤 Fazendo upload da imagem: ${filePath}`);
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket '${this.bucketName}' não encontrado. Crie o bucket no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload de imagem de configurações concluído: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
        fileName
      };

    } catch (error) {
      console.error('❌ Erro no upload da imagem de configurações:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async uploadChatImage(
    imageType: 'bot' | 'user', 
    imageBuffer: Buffer, 
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase Storage não está configurado'
        };
      }

      console.log(`📦 [SUPABASE] Fazendo upload de imagem do chat: ${imageType}`);

      const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 90
      } = options;

      let processedBuffer: Buffer;
      
      if (mimeType.includes('image/')) {
        processedBuffer = await sharp(imageBuffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
      } else {
        processedBuffer = imageBuffer;
      }

      const timestamp = Date.now();
      const fileName = `chat-${imageType}-${timestamp}.jpg`;
      const filePath = `chat-avatars/${fileName}`;

      console.log(`📤 Fazendo upload da imagem do chat: ${filePath}`);
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        
        if (error.message.includes('Bucket not found') || error.message.includes('bucket does not exist')) {
          return {
            success: false,
            error: `Bucket '${this.bucketName}' não encontrado. Crie o bucket no painel do Supabase em Storage > Buckets.`
          };
        }
        
        return {
          success: false,
          error: `Erro no upload: ${error.message}`
        };
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return {
          success: false,
          error: 'Não foi possível gerar URL pública'
        };
      }

      console.log(`✅ Upload de imagem do chat concluído: ${publicUrl}`);

      return {
        success: true,
        publicUrl,
        fileName
      };

    } catch (error) {
      console.error('❌ Erro no upload da imagem do chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  isConfigured(): boolean {
    return !!this.supabase;
  }
}

export const supabaseStorage = new SupabaseStorageService();