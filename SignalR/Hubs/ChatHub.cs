using Microsoft.AspNetCore.SignalR;
using SignalR.DbContexts;

namespace SignalR.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ChatWebContext _context;

        public ChatHub(ChatWebContext context )
        {
            _context = context;
          
        }

        public async Task Send(string userName, string message)
        {
            var meesage = new Models.ChatWeb
            {
                UserName = userName,
                Message = message
            };
            await _context.ChatsWeb.AddAsync(meesage);
            await _context.SaveChangesAsync();
            await Clients.All.SendAsync("ReciveMessage", userName, message);


        }



        public async Task joinGroup(string groupName, string userName)
        {

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.Group(groupName).SendAsync("ReciveMessageFromGroup", userName);


        }


        public async Task SendToGroup(string groupName, string userName, string message)
        {
            var meesage = new Models.ChatWeb
            {
                UserName = userName,
                Message = message
            };
            await _context.ChatsWeb.AddAsync(meesage);
            await _context.SaveChangesAsync();
            await Clients.Group(groupName).SendAsync("ReciveMessageFromGroup", userName, message);


        }





    }
}
