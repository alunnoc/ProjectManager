/*
 *  Example of write access to shared memory from user-space
 */


#include <stdio.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>

int memfd;


int main(int argc, char *argv[])
{
  unsigned short *mem=0;
  unsigned w;
  int n=1;
  unsigned int addr= 0;
  unsigned int memory_base=0 ;
  char mode;
  char op='r';
  int quiet=0;
  clock_t t1;
  clock_t t2;
  unsigned int val32;
  unsigned short val16;
  unsigned char val8;
  double time_sec;


  if(argc<=2) {
    printf ("syntax: map [-]short|long|byte 0xAdd [=0xVal]|[*N_read]|[quiet] \n");
    return 1;
  }

  mode = argv[1][0];
  if (mode=='-') mode = argv[1][1];

  if(sscanf(argv[2],"0x%x",&addr) !=1 || (mode != 's' && mode!= 'l' && mode!='b'))
    {
      printf ("syntax: map [-]short|long|byte 0xAddress  [=0xVal]|[*N_read]|[quiet] \n") ;
      return 1;
    }

  if (argc>3)
    {
      if(argv[3][0]=='q')
	{
	  quiet=1;
	}
      else if(1==sscanf(argv[3],"=0x%x",&w))
	{
	  printf("write.%c %x = %x\n",mode,addr,w);
	  op='w';
	}
      else if( 1== sscanf(argv[3],"*%d",&n))
	{
	  if(n > 0xFFFF/4) { printf("too much multiple read (%d)\n",n); return 1; }
	  printf("multiple %d read.%c\n",n,mode);
	} else {
	printf ("syntax: map short|long|byte 0xAddress  [=0xVal]|[*N_read]|[quiet] \n") ;
	return 1;
      }
    }
  memfd = open(argv[4], O_RDWR);
  if (!memfd)
    {
      printf("Failed to open memory device file\n");
      return -1;
    }
  memory_base=addr  & 0xffc00000;
  {
    unsigned int size=0x400000;
    mem =  mmap(NULL,
	      size,
	      PROT_READ | PROT_WRITE,
	      MAP_SHARED,
	      memfd,
	      (off_t)memory_base);
    // printf("DEB: size=%x, base=%lx \n",size,(off_t)memory_base);
  }
  if(mem == MAP_FAILED)
    {
      perror("Failed to map memory\n");
      close (memfd);
      return -1;
    }

  if (op=='r')
    {
      int i;
      for (i=0;i<n;i++)
	switch (mode)
        {
        case 's':
	  if (!quiet)
	    {
	      t1 = clock();
	      val16 = ((unsigned short*)mem)[((addr&0x3ffFFF)>>1)+i];
	      t2 = clock();
	      time_sec = (double)(t2-t1)/(double)(CLOCKS_PER_SEC);
	      // printf ("@ %08X = %04X in %f (s)\n", addr+(i*2), val16, time_sec);
	      printf ("@ %08X = %04X \n", addr+(i*2), val16);
	    }
	  else
	    {
	      val16 = ((unsigned short*)mem)[((addr&0x3ffFFF)>>1)+i];
	      printf ("%04X\n", val16);
	    }
        break;
	case 'l':
 	  if (!quiet)
	    {
	      t1 = clock();
	      val32 = ((unsigned int*)mem)[((addr&0x3ffFFF)>>2)+i];
	      t2 = clock();
	      time_sec = (double)(t2-t1)/(double)(CLOCKS_PER_SEC);
	      // printf ("@ %08X = %08X in %f (s)\n",  addr+(i*4), val32, time_sec);
	      printf ("@ %08X = %08X\n",  addr+(i*4), val32);
	    }
	  else
	    {
	      val32 = ((unsigned int*)mem)[((addr&0x3ffFFF)>>2)+i];
	      printf ("%08X\n", val32);
	    }
        break;
	case 'b':
	  if (!quiet)
	    {
	      t1 = clock();
	      val8 = ((unsigned char *)mem)  [((addr&0x3ffFFF))+i];
	      t2 = clock();
	      time_sec = (double)(t2-t1)/(double)(CLOCKS_PER_SEC);
	      // printf ("@ %08X = %02X in %f (s)\n",  addr+(i), val8, time_sec);
	      printf ("@ %08X = %02X\n",  addr+(i), val8);
	    }
	  else
	    {
	      val8 = ((unsigned char *)mem)  [((addr&0x3ffFFF))+i];
	      printf ("%02X\n", val8);
	    }
	break;
	default:
	  printf("Unsupported format\n");
	  exit(1);
	}

    } else {
     if(mode=='b') ((unsigned char  *) mem)[(addr&0x3ffFFF)   ]=w;
     if(mode=='s') ((unsigned short *) mem)[(addr&0x3ffFFF)>>1]=w;
     if(mode=='l') ((unsigned int   *) mem)[(addr&0x3ffFFF)>>2]=w;

  }

  close(memfd);
  return 0;
}
