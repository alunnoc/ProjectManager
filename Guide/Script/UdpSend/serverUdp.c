#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>

#define MYBUFSIZE 1024

int main(int argc, char *argv[])
{
    // test argomenti
    if (argc != 2) {
        // errore args
        printf("%s: numero argomenti errato\n", argv[0]);
        printf("uso: %s port [i.e.: %s 8888]\n", argv[0], argv[0]);
        return EXIT_FAILURE;
    }

    // crea un socket
    int my_socket;
    if ((my_socket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) < 0) {
        // errore socket()
        printf("%s: non posso creare il socket (%s)\n", argv[0], strerror(errno));
        return EXIT_FAILURE;
    }

    // prepara la struttura sockaddr_in per questo server
    struct sockaddr_in server;              // (local) server socket info
    memset(&server, 0, sizeof(server));
    server.sin_family = AF_INET;            // set address family
    server.sin_addr.s_addr = INADDR_ANY;    // set server address for any interface
    server.sin_port = htons(atoi(argv[1])); // set server port number

    // bind informazioni del server al socket
    if (bind(my_socket, (struct sockaddr *)&server, sizeof(server)) < 0) {
        // errore bind()
        printf("%s: errore bind (%s)", argv[0], strerror(errno));
        return EXIT_FAILURE;
    }

    // loop di ricezione messaggi dal client
    struct sockaddr_in client;  // appoggio per dati del client per poter rispondere
    socklen_t socksize = sizeof(struct sockaddr_in);
    char client_msg[MYBUFSIZE];
    while (recvfrom(my_socket, client_msg, MYBUFSIZE, 0, (struct sockaddr *)&client, &socksize) > 0) {
        // send messaggio di ritorno al client
        printf("%s: ricevuto messaggio dal sock %d: %s\n", argv[0], my_socket, client_msg);
        char server_msg[MYBUFSIZE];
        sprintf(server_msg, "mi hai scritto: %s", client_msg);
        if (sendto(my_socket, server_msg, strlen(server_msg), 0, (struct sockaddr *)&client, sizeof(client)) < 0) {
            // errore send()
            printf("%s: errore send (%s)\n", argv[0], strerror(errno));
            return EXIT_FAILURE;
        }

        // clear buffer
        memset(client_msg, 0, MYBUFSIZE);
    }

    // errore recv(): il "client disconnected" con recv_size==0 non esiste perché questo server è connectionless
    printf("%s: errore recv (%s)\n", argv[0], strerror(errno));
    return EXIT_FAILURE;
}