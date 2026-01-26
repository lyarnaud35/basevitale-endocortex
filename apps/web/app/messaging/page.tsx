'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function MessagingPage() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');

  const { isConnected } = useWebSocket();

  const {
    data: threads,
    isLoading: threadsLoading,
    refetch: refetchThreads,
  } = useApi<any[]>('/messaging/threads', {
    enabled: true,
  });

  const {
    data: messages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useApi<any[]>(
    selectedThread ? `/messaging/messages?threadId=${selectedThread}` : '',
    {
      enabled: !!selectedThread,
    },
  );

  const {
    data: unreadCount,
    refetch: refetchUnread,
  } = useApi<{ count: number }>('/messaging/unread-count');

  useEffect(() => {
    if (selectedThread) {
      refetchMessages();
    }
  }, [selectedThread]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipientId) return;

    try {
      const response = await fetch(`${API_URL}/messaging/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          recipientId,
          content: newMessage,
          messageType: 'TEXT',
        }),
      });

      if (response.ok) {
        setNewMessage('');
        refetchMessages();
        refetchThreads();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          ← Retour à l'accueil
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Messagerie Interne
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </span>
            {unreadCount && unreadCount.count > 0 && (
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                {unreadCount.count} non lus
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste des threads */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Conversations</h2>
              {threadsLoading ? (
                <p className="text-gray-500">Chargement...</p>
              ) : threads && threads.length > 0 ? (
                <div className="space-y-2">
                  {threads.map((thread: any) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={`w-full text-left p-3 rounded-lg ${
                        selectedThread === thread.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <p className="font-semibold">
                        {thread.name || `Thread ${thread.id.slice(0, 8)}`}
                      </p>
                      {thread.messages?.[0] && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {thread.messages[0].content}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucune conversation</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-[600px]">
              {selectedThread ? (
                <>
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {messagesLoading ? (
                      <p className="text-gray-500">Chargement...</p>
                    ) : messages && messages.length > 0 ? (
                      messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.senderId === 'current-user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.senderId === 'current-user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.senderId === 'current-user'
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center">Aucun message</p>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tapez votre message..."
                      />
                      <button
                        onClick={handleSendMessage}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-500">
                    Sélectionnez une conversation pour commencer
                  </p>
                </div>
              )}
            </div>

            {/* Nouveau message */}
            {!selectedThread && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
                <h2 className="text-xl font-semibold mb-4">Nouveau Message</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destinataire (ID)
                    </label>
                    <input
                      type="text"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !recipientId}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
