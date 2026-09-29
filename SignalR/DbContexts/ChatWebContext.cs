using Microsoft.EntityFrameworkCore;
using SignalR.Models;

namespace SignalR.DbContexts
{
    public class ChatWebContext:DbContext
    {
        public ChatWebContext(DbContextOptions<ChatWebContext> option):base(option)
        {
            
        }

        public DbSet<ChatWeb> ChatsWeb { get; set; }

    }
}
