#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>
#include <time.h>

#define PORT 33333
#define NUMBER_OF_SOCKETS 5
#define MSG_LEN 8
#define NUMBER_OF_MESSAGE 10
#define DELAY 1000000

void sendMessage
(
	int socket,
	char *msg,
	struct sockaddr_in server
);

struct peers
{
	int mySocket;
	char msg[MSG_LEN];

}peer;


int main
(
	int argc, char const *argv[]
)
{

	struct peers peer[NUMBER_OF_SOCKETS];
    struct sockaddr_in server; 
	int i;
	int j;
	char name[MSG_LEN] = "Socket ";
	char *ipAddr = "192.168.42.108";

	memset(&peer, 0, sizeof(peer));
	memset(&server, 0, sizeof(server));

	for (int i = 0; i < NUMBER_OF_SOCKETS; ++i)
	{	
		if ((peer[i].mySocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) < 0)
		{
			printf("Error opening socket number %d\n", i);
			return EXIT_FAILURE;
		}
		
		name[6] = i + '0';
		strcpy(peer[i].msg, name);
	}

    server.sin_family = AF_INET;                   
    server.sin_addr.s_addr = inet_addr(ipAddr);    
    server.sin_port = htons(PORT);       

    for (int i = 0; i < NUMBER_OF_SOCKETS; ++i)
    {
    	printf("%d\n", peer[i].mySocket);
    	printf("%s\n", peer[i].msg);
    }

    /*Send messages*/

    for (i = 0; i < NUMBER_OF_MESSAGE; i++)
    {
		for (j = 0; j < NUMBER_OF_SOCKETS ; ++j)
		{
			
    		sendMessage(peer[j].mySocket, peer[j].msg, server);
    		usleep(DELAY);
		}
    }

    for (i = 0; i < NUMBER_OF_SOCKETS; i++)
    {
		for (j = 0; j < NUMBER_OF_MESSAGE; ++j)
		{
		
    		sendMessage(peer[i].mySocket, peer[i].msg, server);
			usleep(DELAY);
		}
    }

    return 0;

}

void sendMessage
(
	int socket,
	char *msg,
	struct sockaddr_in server
)
{

	if (sendto(socket, msg, sizeof(msg), 0, (struct sockaddr *)&server, sizeof(server)) < 0) 
	{
		// errore send()
		printf("Errore invio\n");
	}

}
