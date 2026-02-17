export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'patient' | 'doctor';
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

export interface Conversation {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export const mockConversations: Conversation[] = [
  {
    id: '1',
    doctorId: 'd1',
    doctorName: 'Dr. Alfonso Reyes',
    doctorSpecialty: 'Medicina General',
    doctorAvatar: '#7C3AED',
    lastMessage: 'Claro, te envío los resultados mañana.',
    lastMessageTime: '10:30 AM',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    doctorId: 'd2',
    doctorName: 'Dra. Mariana Tamez',
    doctorSpecialty: 'Cardiología',
    doctorAvatar: '#EC4899',
    lastMessage: 'Recuerda tomar el medicamento cada 8 horas.',
    lastMessageTime: 'Ayer',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '3',
    doctorId: 'd3',
    doctorName: 'Dr. Luis Colosio',
    doctorSpecialty: 'Dermatología',
    doctorAvatar: '#3B82F6',
    lastMessage: 'Perfecto, nos vemos el viernes.',
    lastMessageTime: 'Mar 4',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '4',
    doctorId: 'd4',
    doctorName: 'Dr. Rene Cantu',
    doctorSpecialty: 'Pediatría',
    doctorAvatar: '#10B981',
    lastMessage: 'Todo está en orden con los análisis.',
    lastMessageTime: 'Feb 1',
    unreadCount: 0,
    isOnline: true,
  },
];

export const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      conversationId: '1',
      senderId: 'd1',
      senderType: 'doctor',
      content: '¡Hola! ¿Cómo te has sentido desde la última consulta?',
      timestamp: '2026-02-05T09:00:00',
      read: true,
    },
    {
      id: 'm2',
      conversationId: '1',
      senderId: 'patient',
      senderType: 'patient',
      content: 'Hola doctor, me he sentido mucho mejor. El dolor de espalda ha disminuido considerablemente.',
      timestamp: '2026-02-05T09:15:00',
      read: true,
    },
    {
      id: 'm3',
      conversationId: '1',
      senderId: 'd1',
      senderType: 'doctor',
      content: 'Me da gusto escuchar eso. ¿Has estado haciendo los ejercicios que te recomendé?',
      timestamp: '2026-02-05T09:20:00',
      read: true,
    },
    {
      id: 'm4',
      conversationId: '1',
      senderId: 'patient',
      senderType: 'patient',
      content: 'Sí, los hago todas las mañanas. También quería preguntarte sobre los resultados de los análisis de sangre.',
      timestamp: '2026-02-05T09:25:00',
      read: true,
    },
    {
      id: 'm5',
      conversationId: '1',
      senderId: 'd1',
      senderType: 'doctor',
      content: 'Claro, te envío los resultados mañana. Todo salió dentro de los rangos normales, no hay nada de qué preocuparse.',
      timestamp: '2026-02-05T10:30:00',
      read: false,
    },
    {
      id: 'm6',
      conversationId: '1',
      senderId: 'd1',
      senderType: 'doctor',
      content: 'Si tienes alguna duda sobre los resultados, podemos agendar una videollamada.',
      timestamp: '2026-02-05T10:31:00',
      read: false,
    },
  ],
  '2': [
    {
      id: 'm7',
      conversationId: '2',
      senderId: 'd2',
      senderType: 'doctor',
      content: 'Buenos días, revisé tu electrocardiograma y todo está perfecto.',
      timestamp: '2026-02-04T11:00:00',
      read: true,
    },
    {
      id: 'm8',
      conversationId: '2',
      senderId: 'patient',
      senderType: 'patient',
      content: '¡Qué buenas noticias! Gracias doctora. ¿Debo seguir con la misma medicación?',
      timestamp: '2026-02-04T11:30:00',
      read: true,
    },
    {
      id: 'm9',
      conversationId: '2',
      senderId: 'd2',
      senderType: 'doctor',
      content: 'Sí, continúa con la dosis actual. Recuerda tomar el medicamento cada 8 horas y no omitir ninguna toma.',
      timestamp: '2026-02-04T12:00:00',
      read: true,
    },
  ],
  '3': [
    {
      id: 'm10',
      conversationId: '3',
      senderId: 'patient',
      senderType: 'patient',
      content: 'Doctor, ¿podemos cambiar la cita del viernes a las 3pm?',
      timestamp: '2026-02-03T14:00:00',
      read: true,
    },
    {
      id: 'm11',
      conversationId: '3',
      senderId: 'd3',
      senderType: 'doctor',
      content: 'Perfecto, nos vemos el viernes a las 3pm. Te confirmo la cita.',
      timestamp: '2026-02-03T14:15:00',
      read: true,
    },
  ],
  '4': [
    {
      id: 'm12',
      conversationId: '4',
      senderId: 'd4',
      senderType: 'doctor',
      content: 'Hola, los análisis de tu hijo llegaron. Todo está en orden.',
      timestamp: '2026-02-01T16:00:00',
      read: true,
    },
    {
      id: 'm13',
      conversationId: '4',
      senderId: 'patient',
      senderType: 'patient',
      content: 'Excelente doctor, muchas gracias por avisar. ¿Necesitamos programar seguimiento?',
      timestamp: '2026-02-01T16:30:00',
      read: true,
    },
  ],
};

export function getConversationById(id: string): Conversation | undefined {
  return mockConversations.find(c => c.id === id);
}

export function getMessagesByConversationId(conversationId: string): Message[] {
  return mockMessages[conversationId] || [];
}

export function addMessage(conversationId: string, message: Omit<Message, 'id'>): Message {
  const newMessage: Message = {
    ...message,
    id: `m${Date.now()}`,
  };
  
  if (!mockMessages[conversationId]) {
    mockMessages[conversationId] = [];
  }
  
  mockMessages[conversationId].push(newMessage);
  
  // Update last message in conversation
  const conversation = mockConversations.find(c => c.id === conversationId);
  if (conversation) {
    conversation.lastMessage = message.content;
    conversation.lastMessageTime = 'Ahora';
  }
  
  return newMessage;
}
